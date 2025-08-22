// pages/api/saveAnalysis.js
import connectDB from '../../lib/mongodb';
import SGFAnalysisResult from '../../models/SGFAnalysisResult';
import withCors from './withCors';

async function handler(req, res) {
  // 添加详细的请求日志
  console.log('\n=== saveAnalysis API 调用 ===');
  console.log('时间:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false,
      error: `Method ${req.method} Not Allowed`,
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    await connectDB();
    console.log('✓ 数据库连接成功');
  } catch (dbError) {
    console.error('✗ 数据库连接失败:', dbError);
    return res.status(500).json({
      success: false,
      error: '数据库连接失败',
      code: 'DATABASE_CONNECTION_ERROR'
    });
  }

  try {
    // 检查请求体是否存在
    if (!req.body) {
      console.log('✗ 请求体为空');
      return res.status(400).json({
        success: false,
        error: '请求体不能为空',
        code: 'EMPTY_BODY'
      });
    }

    // 显示请求体的结构
    console.log('请求体结构:');
    console.log('- 类型:', typeof req.body);
    console.log('- 顶级键:', Object.keys(req.body));
    
    // 检查请求体大小
    const requestSize = JSON.stringify(req.body).length;
    const maxSize = 10 * 1024 * 1024; // 10MB
    console.log('- 大小:', requestSize, 'bytes');
    
    if (requestSize > maxSize) {
      return res.status(413).json({
        success: false,
        error: '请求数据过大，单次请求不能超过10MB',
        code: 'PAYLOAD_TOO_LARGE'
      });
    }

    const {
      sgf,
      analysisConfig,
      analysisResults,
      metadata
    } = req.body;

    // 详细显示每个字段的情况
    console.log('\n字段检查:');
    console.log('sgf:', sgf ? '存在' : '缺失');
    if (sgf) {
      console.log('  - sgf.hash:', sgf.hash ? '存在' : '缺失');
      console.log('  - sgf.filename:', sgf.filename ? '存在' : '缺失');
      console.log('  - sgf.content:', sgf.content ? '存在' : '缺失');
      console.log('  - sgf 的所有键:', Object.keys(sgf));
    }
    
    console.log('analysisConfig:', analysisConfig ? '存在' : '缺失');
    if (analysisConfig) {
      console.log('  - analysisConfig.engineVersion:', analysisConfig.engineVersion ? '存在' : '缺失');
      console.log('  - analysisConfig.totalMoves:', analysisConfig.totalMoves, '(类型:', typeof analysisConfig.totalMoves, ')');
      console.log('  - analysisConfig 的所有键:', Object.keys(analysisConfig));
    }
    
    console.log('analysisResults:', analysisResults ? `数组，长度: ${analysisResults.length}` : '缺失');
    if (analysisResults && analysisResults.length > 0) {
      console.log('  - 第一个元素的键:', Object.keys(analysisResults[0]));
    }
    
    console.log('metadata:', metadata ? '存在' : '缺失');
    if (metadata) {
      console.log('  - metadata 的所有键:', Object.keys(metadata));
    }

    // 验证必需字段
    const validationErrors = validateRequiredFields({
      sgf,
      analysisConfig,
      analysisResults,
      metadata
    });

    if (validationErrors.length > 0) {
      console.log('\n✗ 验证失败，缺少字段:', validationErrors);
      return res.status(400).json({
        success: false,
        error: '缺少必需字段: ' + validationErrors.join(', '),
        code: 'MISSING_REQUIRED_FIELDS',
        receivedData: {
          sgf: sgf ? Object.keys(sgf) : null,
          analysisConfig: analysisConfig ? Object.keys(analysisConfig) : null,
          analysisResults: analysisResults ? `array[${analysisResults.length}]` : null,
          metadata: metadata ? Object.keys(metadata) : null
        }
      });
    }

    console.log('✓ 字段验证通过');

    // 验证 SGF 哈希值
    if (!sgf.hash || typeof sgf.hash !== 'string') {
      console.log('✗ SGF 哈希值无效:', sgf.hash);
      return res.status(400).json({
        success: false,
        error: 'SGF 哈希值无效',
        code: 'INVALID_HASH'
      });
    }

    console.log('开始查找现有记录，哈希值:', sgf.hash);

    // 检查是否已存在相同哈希的分析结果
    const existingResult = await SGFAnalysisResult.findByHash(sgf.hash);
    
    if (existingResult) {
      console.log('✓ 找到现有记录，准备更新');
      // 更新现有记录
      existingResult.sgf = {
        ...existingResult.sgf,
        ...sgf,
        uploadTime: sgf.uploadTime || existingResult.sgf.uploadTime
      };
      existingResult.analysisConfig = {
        ...existingResult.analysisConfig,
        ...analysisConfig,
        analysisDate: analysisConfig.analysisDate || new Date().toISOString()
      };
      existingResult.analysisResults = analysisResults;
      existingResult.metadata = {
        ...existingResult.metadata,
        ...metadata,
        updatedAt: new Date().toISOString(),
        analysisStatus: metadata.analysisStatus || 'completed'
      };

      await existingResult.save();
      console.log('✓ 现有记录更新成功');

      return res.status(200).json({
        success: true,
        message: '分析结果更新成功',
        analysisId: existingResult._id.toString()
      });
    } else {
      console.log('✓ 未找到现有记录，准备创建新记录');
      // 创建新记录
      const analysisResult = new SGFAnalysisResult({
        sgf: {
          ...sgf,
          uploadTime: sgf.uploadTime || new Date().toISOString()
        },
        analysisConfig: {
          ...analysisConfig,
          analysisDate: analysisConfig.analysisDate || new Date().toISOString()
        },
        analysisResults,
        metadata: {
          ...metadata,
          createdAt: metadata.createdAt || new Date().toISOString(),
          updatedAt: metadata.updatedAt || new Date().toISOString(),
          analysisStatus: metadata.analysisStatus || 'completed'
        }
      });

      await analysisResult.save();
      console.log('✓ 新记录创建成功');

      return res.status(200).json({
        success: true,
        message: '分析结果保存成功',
        analysisId: analysisResult._id.toString()
      });
    }

  } catch (error) {
    console.error('\n✗ 保存分析结果失败:', error.message);
    console.error('错误堆栈:', error.stack);
    
    // 处理不同类型的错误
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: '该 SGF 文件的分析结果已存在',
        code: 'DUPLICATE_HASH'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: '数据验证失败: ' + error.message,
        code: 'VALIDATION_ERROR'
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: '数据类型错误: ' + error.message,
        code: 'CAST_ERROR'
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: '服务器内部错误: ' + error.message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
}

// 验证必需字段的辅助函数
function validateRequiredFields({ sgf, analysisConfig, analysisResults, metadata }) {
  const errors = [];
  
  console.log('\n开始字段验证...');
  
  if (!sgf) {
    errors.push('sgf');
    console.log('  ✗ sgf 对象缺失');
  } else {
    if (!sgf.hash) {
      errors.push('sgf.hash');
      console.log('  ✗ sgf.hash 缺失');
    }
    if (!sgf.filename) {
      errors.push('sgf.filename');
      console.log('  ✗ sgf.filename 缺失');
    }
    if (!sgf.content) {
      errors.push('sgf.content');
      console.log('  ✗ sgf.content 缺失');
    }
  }
  
  if (!analysisConfig) {
    errors.push('analysisConfig');
    console.log('  ✗ analysisConfig 对象缺失');
  } else {
    if (!analysisConfig.engineVersion) {
      errors.push('analysisConfig.engineVersion');
      console.log('  ✗ analysisConfig.engineVersion 缺失');
    }
    if (typeof analysisConfig.totalMoves !== 'number') {
      errors.push('analysisConfig.totalMoves');
      console.log('  ✗ analysisConfig.totalMoves 类型错误或缺失:', typeof analysisConfig.totalMoves, '值:', analysisConfig.totalMoves);
    }
  }
  
  if (!analysisResults || !Array.isArray(analysisResults)) {
    errors.push('analysisResults');
    console.log('  ✗ analysisResults 不是数组或缺失');
  } else if (analysisResults.length === 0) {
    errors.push('analysisResults (不能为空数组)');
    console.log('  ✗ analysisResults 是空数组');
  } else {
    // 验证分析结果数组中的必需字段
    analysisResults.forEach((result, index) => {
      if (typeof result.moveNumber !== 'number') {
        errors.push(`analysisResults[${index}].moveNumber`);
        console.log(`  ✗ analysisResults[${index}].moveNumber 类型错误:`, typeof result.moveNumber, '值:', result.moveNumber);
      }
      if (!result.move || typeof result.move.row !== 'number' || typeof result.move.col !== 'number' || !result.move.color) {
        errors.push(`analysisResults[${index}].move`);
        console.log(`  ✗ analysisResults[${index}].move 错误:`, result.move);
      }
    });
  }
  
  if (!metadata) {
    errors.push('metadata');
    console.log('  ✗ metadata 对象缺失');
  }
  
  console.log('验证完成，错误数量:', errors.length);
  return errors;
}

export default withCors(handler);

// 配置请求体大小限制
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}