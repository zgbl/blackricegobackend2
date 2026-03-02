// pages/api/albums.js
import connectDB from '../../lib/mongodb';
import Album from '../../models/Album';
import TestQuestion from '../../models/TestQuestion';
import withCors from './withCors';

async function handler(req, res) {
    try {
        await connectDB();
    } catch (dbError) {
        console.error('✗ MongoDB connection failed (Albums API):', dbError);
        return res.status(500).json({ success: false, message: 'Database connection failed', error: dbError.message });
    }

    const { method } = req;

    switch (method) {
        case 'GET':
            return await getAlbums(req, res);
        case 'POST':
            return await createAlbum(req, res);
        case 'DELETE':
            return await deleteAlbum(req, res);
        default:
            res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
            return res.status(405).json({ success: false, message: `Method ${method} Not Allowed` });
    }
}

async function getAlbums(req, res) {
    try {
        const { producer } = req.query;
        const filter = {};
        if (producer) {
            filter.producer = producer;
        }

        // Sort by most recently updated
        const albums = await Album.find(filter).sort({ updatedAt: -1 }).lean();

        return res.status(200).json({
            success: true,
            data: albums
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch albums', error: error.message });
    }
}

async function createAlbum(req, res) {
    try {
        const { name, producer, description } = req.body;

        if (!name || !producer) {
            return res.status(400).json({ success: false, message: 'Album name and producer are required' });
        }

        // Check if album already exists for this producer
        const existing = await Album.findOne({ name, producer });
        if (existing) {
            return res.status(409).json({ success: false, message: 'Album already exists for this producer' });
        }

        const album = new Album({
            name,
            producer,
            description: description || ''
        });

        const saved = await album.save();
        return res.status(201).json({ success: true, data: saved });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'Album already exists for this producer' });
        }
        return res.status(500).json({ success: false, message: 'Failed to create album', error: error.message });
    }
}

async function deleteAlbum(req, res) {
    try {
        const { id, producer, isAdmin, deleteQuestions = false } = req.body;

        if (!id || !producer) {
            return res.status(400).json({ success: false, message: 'Album ID and producer are required' });
        }

        const album = await Album.findById(id);
        if (!album) {
            return res.status(404).json({ success: false, message: 'Album not found' });
        }

        // Permission check
        if (album.producer !== producer && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Permission denied: Cannot delete an album created by someone else' });
        }

        // Delete Album
        await Album.findByIdAndDelete(id);

        // Handle associated questions
        let deletedQuestionsCount = 0;
        let unlinkedQuestionsCount = 0;

        if (deleteQuestions) {
            const deleteResult = await TestQuestion.deleteMany({ albumId: id });
            deletedQuestionsCount = deleteResult.deletedCount;
        } else {
            // Just unlink them
            const updateResult = await TestQuestion.updateMany(
                { albumId: id },
                { $unset: { albumId: "" } }
            );
            unlinkedQuestionsCount = updateResult.modifiedCount;
        }

        return res.status(200).json({
            success: true,
            message: 'Album deleted successfully',
            data: {
                deletedQuestionsCount,
                unlinkedQuestionsCount
            }
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete album', error: error.message });
    }
}

export default withCors(handler);
