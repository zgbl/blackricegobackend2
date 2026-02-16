const mongoose = require('mongoose');

// MongoDB Connection URI
const MONGODB_URI = 'mongodb+srv://flyer:Flyer123@blackricemongo.t7k7zg3.mongodb.net/blackrice?retryWrites=true&w=majority';

// Define Schema (simplified for reading)
const SGFAnalysisResultSchema = new mongoose.Schema({
    sgf: {
        hash: String,
        filename: String,
        uploadTime: Date
    },
    metadata: {
        createdAt: Date,
        totalAnalysisTime: Number
    },
    analysisResults: Array
});

// Create Model
// forcing collection name 'analysisResults' as seen in typical mongoose usage or previous files
const SGFAnalysisResult = mongoose.model('SGFAnalysisResult', SGFAnalysisResultSchema, 'analysisResults');

async function verifyDB() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected!');

        console.log('Fetching latest analysis result...');
        const latestResult = await SGFAnalysisResult.findOne().sort({ 'metadata.createdAt': -1 });

        if (latestResult) {
            console.log('\n✅ Found latest analysis result:');
            console.log('ID:', latestResult._id);
            console.log('Filename:', latestResult.sgf.filename);
            console.log('Hash:', latestResult.sgf.hash);
            console.log('Created At:', latestResult.metadata.createdAt);
            console.log('Analysis Count:', latestResult.analysisResults.length);
            console.log('Duration:', latestResult.metadata.totalAnalysisTime);

            if (latestResult.analysisResults.length > 0) {
                console.log('Sample Data (First Move):', JSON.stringify(latestResult.analysisResults[0], null, 2).substring(0, 200) + '...');
            }
        } else {
            console.log('\n⚠️ No analysis results found in database.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected.');
    }
}

verifyDB();
