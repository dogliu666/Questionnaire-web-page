// 实验配置
const experimentConfig = {
    fixationDuration: 500, // 注视点显示时间（毫秒）
    imageDuration: 100, // 图片显示时间（毫秒）
    interTrialInterval: 200, // 试次间隔（毫秒）
    imagesPerGroup: 20, // 每组图片数量
    totalGroups: 3, // 总组数 (A组、B组、C组)
    imageBasePath: 'images/', // 图片文件夹路径
    imageCategories: ['people', 'objects', 'food', 'buildings', 'landscape'], // 图片类别
    attentionCheckFrequency: 5, // 每5张图片进行一次注意力检测
    imagesPerCategory: 4 // 每类别图片数量
};

// 实验状态
let experimentState = {
    currentGroup: 0, // 0=A组(AI), 1=B组(人类), 2=C组
    currentImage: 0,
    ratings: [], // 存储所有评分结果
    attentionResults: [], // 存储注意力检测结果
    imagesSequence: [], // 存储图片展示序列
    attentionImages: [], // 存储注意力检测图片
    currentSequenceIndex: 0, // 当前图片在序列中的索引
    experimentGroup: null, // 实验组分配
    userId: null, // 用户ID
    needAttentionCheck: false // 是否需要进行注意力检测
};

// DOM元素引用
const elements = {
    fixationPoint: document.getElementById('fixation-point'),
    imageDisplay: document.getElementById('image-display'),
    ratingForm: document.getElementById('rating-form'),
    attentionCheck: document.getElementById('attention-check'),
    stimulusImage: document.getElementById('stimulus-image'),
    imageTimer: document.getElementById('image-timer'),
    ratingTimer: document.getElementById('rating-timer'),
    progressBar: document.getElementById('overall-progress'),
    progressText: document.getElementById('progress-text'),
    groupCounter: document.getElementById('group-counter'),
    imageCounter: document.getElementById('image-counter')
};

// 计时器ID
let imageTimerInterval = null;
let ratingTimerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    // 从localStorage获取用户数据
    const userData = JSON.parse(localStorage.getItem('userData')) || {};

    // 设置用户ID，如果不存在则生成
    if (!userData.userId) {
        userData.userId = generateUserId();
        localStorage.setItem('userData', JSON.stringify(userData));
    }
    experimentState.userId = userData.userId;

    // 分配实验组 (如果尚未分配)
    if (!userData.experimentGroup) {
        // 根据艺术背景分为艺术组和普通组
        const isArtBackground = isArtisticBackground(userData);

        // 随机分配到A组(0)、B组(1)或C组(2)
        const groupAssignment = Math.floor(Math.random() * 3);

        userData.experimentGroup = {
            isArtBackground: isArtBackground,
            groupType: groupAssignment // 0=A组(AI), 1=B组(手绘), 2=C组
        };

        localStorage.setItem('userData', JSON.stringify(userData));
    }

    experimentState.currentGroup = userData.experimentGroup.groupType;

    // 初始化随机图片序列
    generateImageSequence();

    // 添加注意力检测图片
    insertAttentionChecks();

    updateCounters();
    startTrial();

    // 添加表单提交事件
    document.getElementById('image-rating').addEventListener('submit', function (e) {
        e.preventDefault();
        submitRating();
    });

    document.getElementById('attention-form').addEventListener('submit', function (e) {
        e.preventDefault();
        submitAttentionCheck();
    });
});

/**
 * 判断用户是否有艺术背景
 */
function isArtisticBackground(userData) {
    const artExperience = userData.basicInfo?.art_experience;
    const artEducation = userData.basicInfo?.art_education;
    const occupation = userData.basicInfo?.occupation;

    if (!artExperience || !artEducation || !occupation) return false;

    // 艺术背景判断逻辑：
    // 1. 艺术类学生
    // 2. 艺术类行业从业者
    // 3. 接受过系统的艺术教育/艺术相关学位
    return (
        occupation === '艺术类学生' ||
        occupation === '艺术类行业从业者' ||
        artEducation === '接受过系统的艺术教育/艺术相关学位'
    );
}

/**
 * 生成唯一用户ID
 */
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 生成图片展示序列
 */
function generateImageSequence() {
    experimentState.imagesSequence = [];

    switch (experimentState.currentGroup) {
        case 0: // A组 - AI生成图片
            generateGroupSequence('ai', experimentConfig.imagesPerGroup);
            break;
        case 1: // B组 - 手绘图片
            generateGroupSequence('human', experimentConfig.imagesPerGroup);
            break;
        case 2: // C组 - AI与人类作品C（各10张，共20张）
            const aiImages = generateImagesForTypes('ai', experimentConfig.imagesPerGroup / 2);
            const humanImages = generateImagesForTypes('human', experimentConfig.imagesPerGroup / 2);
            experimentState.imagesSequence = [...aiImages, ...humanImages];
            // 随机打乱C后的序列
            shuffleArray(experimentState.imagesSequence);
            break;
    }
}

/**
 * 为指定组和类型生成图片序列
 */
function generateGroupSequence(type, count) {
    experimentState.imagesSequence = generateImagesForTypes(type, count);
    shuffleArray(experimentState.imagesSequence);
}

/**
 * 生成指定类型和数量的图片列表，确保各类别均衡
 */
function generateImagesForTypes(type, count) {
    const images = [];
    const categories = experimentConfig.imageCategories;
    // 确定每个类别需要的图片数量
    const countPerCategory = Math.ceil(count / categories.length);

    // 为每个类别生成图片
    for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex++) {
        const category = categories[categoryIndex];
        // 计算本类别需要的图片数量
        const categoryCount = Math.min(countPerCategory, count - images.length);

        for (let i = 1; i <= categoryCount; i++) {
            // 构造图片文件名，例如：1.jpg
            const imageFile = `${i}.jpg`;
            // 根据新的路径规则：images/ai/food/1.jpg
            images.push({
                id: `${type}_${category}_${i}`, // 保留id，文件名简化
                path: `${experimentConfig.imageBasePath}${type}/${category}/${imageFile}`,
                type: type,
                category: category
            });
        }
    }

    return images;
}

/**
 * 替换注意力检测图片
 */
function insertAttentionChecks() {
    // 每隔5张替换成注意力检测图
    for (let i = 4; i < experimentState.imagesSequence.length; i += 5) {
        const randomCategoryIndex = Math.floor(Math.random() * experimentConfig.imageCategories.length);
        const selectedCategory = experimentConfig.imageCategories[randomCategoryIndex];
        const randomImageNumber = Math.floor(Math.random() * experimentConfig.imagesPerCategory) + 1;
        const imagePath = `${experimentConfig.imageBasePath}attention/${selectedCategory}/${randomImageNumber}.jpg`;

        const attentionImage = {
            id: `attention_check_${(i / 5) + 1}`,
            path: imagePath,
            type: 'attention',
            category: selectedCategory,
            correctAnswer: selectedCategory // 确保这里设置了正确答案
        };
        // 替换第i张图片为注意力检测图
        experimentState.imagesSequence[i] = attentionImage;
    }
}

/**
 * 随机打乱数组
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * 更新计数器和进度条
 */
function updateCounters() {
    const totalImages = experimentState.imagesSequence.length;
    const currentIndex = experimentState.currentSequenceIndex + 1;

    // 进度百分比
    const progressPercentage = Math.min(100, Math.max(0, (currentIndex / totalImages) * 100));
    document.getElementById('overall-progress').style.width = `${progressPercentage}%`;

    // 更新进度文本
    document.getElementById('progress-text').textContent = `${currentIndex} / ${totalImages}`;
    document.getElementById('image-counter').textContent = `图片: ${currentIndex}/${totalImages}`;
}

/**
 * 开始一个试验
 */
function startTrial() {
    if (experimentState.currentSequenceIndex >= experimentState.imagesSequence.length) {
        finishExperiment();
        return;
    }

    updateCounters();

    // 获取当前图片对象
    const currentImage = experimentState.imagesSequence[experimentState.currentSequenceIndex];

    // 检查是否为注意力检测图片
    experimentState.needAttentionCheck = currentImage.type === 'attention';

    // 隐藏其他所有内容，只显示注视点
    document.getElementById('fixation-point').style.display = 'flex';
    document.getElementById('image-display').style.display = 'block';
    document.getElementById('stimulus-image').style.display = 'none';
    document.getElementById('rating-form').style.display = 'none';
    document.getElementById('attention-check').style.display = 'none';
    document.getElementById('image-timer').style.display = 'none';

    // 在注视点显示后显示图片
    setTimeout(() => {
        showImage();
    }, experimentConfig.fixationDuration);
}

/**
 * 显示当前图片
 */
function showImage() {
    // 获取当前图片
    const currentImage = experimentState.imagesSequence[experimentState.currentSequenceIndex];

    if (!currentImage) {
        console.error('没有更多图片可展示');
        finishExperiment();
        return;
    }

    // 隐藏注视点，显示图片和计时器
    document.getElementById('fixation-point').style.display = 'none';
    document.getElementById('stimulus-image').style.display = 'block';
    document.getElementById('image-timer').style.display = 'block';
    document.getElementById('stimulus-image').src = currentImage.path;

    // 设置图片计时器
    let timeLeft = Math.ceil(experimentConfig.imageDuration / 1000);
    document.getElementById('image-timer').textContent = timeLeft + 's';

    // 清除可能存在的旧计时器
    if (window.imageTimerInterval) {
        clearInterval(window.imageTimerInterval);
    }

    // 启动新计时器
    const startTime = Date.now();
    window.imageTimerInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        timeLeft = Math.max(0, Math.ceil((experimentConfig.imageDuration - elapsedTime) / 1000));
        document.getElementById('image-timer').textContent = timeLeft + 's';

        if (timeLeft <= 0 || elapsedTime >= experimentConfig.imageDuration) {
            clearInterval(window.imageTimerInterval);
            // 图片展示结束，直接进入评分问卷
            showRatingForm();
        }
    }, 200);
}

/**
 * 显示评分表单
 */
function showRatingForm() {
    // 隐藏图片显示区域和注意力检测区域，显示评分表单
    document.getElementById('image-display').style.display = 'none';
    document.getElementById('attention-check').style.display = 'none';
    document.getElementById('rating-form').style.display = 'block';

    // 重置表单
    document.getElementById('image-rating').reset();

    // 隐藏评分计时器
    document.getElementById('rating-timer').style.display = 'none';
}

/**
 * 显示注意力检测问题
 */
function showAttentionCheck(image) {
    // 隐藏其他区域，显示注意力检测
    document.getElementById('image-display').style.display = 'none';
    document.getElementById('rating-form').style.display = 'none';
    document.getElementById('attention-check').style.display = 'block';

    // 设置问题
    const attentionQuestion = document.querySelector('#attention-check h2 + p');
    attentionQuestion.textContent = '请回答关于刚才看到的风景图片的问题：';

    // 重置表单
    document.getElementById('attention-form').reset();
}

/**
 * 提交注意力检测答案
 */
function submitAttentionCheck() {
    // 获取用户选择的答案
    const selectedAnswer = document.querySelector('input[name="attention"]:checked');
    
    // 检查是否选择了答案
    if (!selectedAnswer) {
        alert('请选择一个选项');
        return;
    }
    
    const answerValue = selectedAnswer.value;

    // 获取当前图片
    const currentImage = experimentState.imagesSequence[experimentState.currentSequenceIndex];
    
    // 添加安全检查，确保currentImage存在且具有correctAnswer属性
    if (!currentImage) {
        console.error('注意力检测错误：当前图片对象未找到');
        // 继续实验流程，跳过此次检测
        experimentState.currentSequenceIndex++;
        showAttentionBreak();
        return;
    }
    
    // 如果没有correctAnswer属性，使用图片的category作为默认答案
    const correctAnswer = currentImage.correctAnswer || currentImage.category;

    // 记录结果
    const attentionResult = {
        userId: experimentState.userId,
        timestamp: new Date().toISOString(),
        imageId: currentImage.id,
        userAnswer: answerValue,
        correctAnswer: correctAnswer,
        isCorrect: answerValue === correctAnswer
    };

    // 保存结果
    experimentState.attentionResults.push(attentionResult);

    // 从localStorage获取用户数据
    const userData = JSON.parse(localStorage.getItem('userData')) || {};

    // 确保experimentData和attentionResults存在
    if (!userData.experimentData) userData.experimentData = {};
    if (!userData.experimentData.attentionResults) userData.experimentData.attentionResults = [];

    // 保存结果
    userData.experimentData.attentionResults.push(attentionResult);
    localStorage.setItem('userData', JSON.stringify(userData));

    // 更新图片序列索引并继续实验
    experimentState.currentSequenceIndex++;
    
    // 检查是否完成所有图片
    if (experimentState.currentSequenceIndex >= experimentState.imagesSequence.length) {
        finishExperiment();
    } else {
        // 注意力检测完成后进入休息环节
        showAttentionBreak();
    }
}

/**
 * 显示注意力检测后的1分钟休息界面，用户可点击跳过按钮提前结束
 */
function showAttentionBreak() {
    // 隐藏其他区域
    document.getElementById('image-display').style.display = 'none';
    document.getElementById('rating-form').style.display = 'none';
    document.getElementById('attention-check').style.display = 'none';

    // 显示休息屏幕
    const breakScreen = document.getElementById('break-screen');
    breakScreen.style.display = 'block';
    const breakTimerElem = document.getElementById('break-timer');
    let timeLeft = 60;
    breakTimerElem.textContent = timeLeft + 's';

    // 每秒更新倒计时
    const breakInterval = setInterval(() => {
        timeLeft--;
        breakTimerElem.textContent = timeLeft + 's';
        if (timeLeft <= 0) {
            clearInterval(breakInterval);
            finishBreak();
        }
    }, 1000);

    // 添加一次性跳过按钮事件
    document.getElementById('skip-break').addEventListener('click', () => {
        clearInterval(breakInterval);
        finishBreak();
    }, { once: true });
}

/**
 * 结束休息阶段，转至评分表单
 */
function finishBreak() {
    document.getElementById('break-screen').style.display = 'none';
    
    // 检查是否已完成所有图片
    if (experimentState.currentSequenceIndex >= experimentState.imagesSequence.length) {
        console.log('所有图片已显示完成，结束实验');
        finishExperiment();
    } else {
        console.log('继续下一张图片, 索引:', experimentState.currentSequenceIndex);
        startTrial();
    }
}

/**
 * 获取单选按钮选中的值
 */
function getSelectedRadioValue(name) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : '';
}

/**
 * 显示休息环节
 */
function showRest() {
    // 隐藏评分表单
    document.getElementById('rating-form').style.display = 'none';
    // 显示休息屏幕
    const restScreen = document.getElementById('rest-screen');
    restScreen.style.display = 'block';

    // 休息2秒后隐藏休息屏幕并启动下一试次
    setTimeout(() => {
        restScreen.style.display = 'none';
        
        // 先检查是否实验结束
        if (experimentState.currentSequenceIndex >= experimentState.imagesSequence.length) {
            console.log('休息结束后检测到实验完成，准备结束实验');
            finishExperiment();
        } else {
            console.log('休息结束，继续下一张图片');
            startTrial();
        }
    }, experimentConfig.interTrialInterval);
}
/**
 * 提交评分
 */
function submitRating() {
    // 清除之前的错误提示信息
    document.querySelectorAll('.error-message').forEach(el => el.remove());

    // 检查所有评分是否已选择
    const ratingFields = ['moral_disgust', 'technical_flaws', 'originality', 'emotional', 'visual_appeal'];
    let incomplete = false;
    ratingFields.forEach(field => {
        if (!getSelectedRadioValue(field)) {
            incomplete = true;
            // 找到对应评分问题的容器
            const container = document.querySelector(`input[name="${field}"]`).closest('.rating-question');
            // 创建错误提示元素
            const errorEl = document.createElement('div');
            errorEl.className = 'error-message';
            errorEl.style.color = 'red';
            errorEl.style.fontSize = '0.9em';
            errorEl.style.marginTop = '4px';
            errorEl.textContent = '请完整选择此项评分';
            container.appendChild(errorEl);
        }
    });

    // 如果有未完成的评分，弹出提示并返回
    if (incomplete) {
        alert('请填写所有评分选项后再提交！');
        return;
    }

    // 清除评分计时器
    if (window.ratingTimerInterval) {
        clearInterval(window.ratingTimerInterval);
    }

    // 获取当前图片
    const currentImage = experimentState.imagesSequence[experimentState.currentSequenceIndex];

    // 收集评分
    const rating = {
        userId: experimentState.userId,
        imageId: currentImage.id,
        timestamp: new Date().toISOString(),
        group: ['A', 'B', 'C'][experimentState.currentGroup],
        imageType: currentImage.type,
        imageCategory: currentImage.category,
        moralDisgust: parseInt(getSelectedRadioValue('moral_disgust')) || 0,
        technicalFlaws: parseInt(getSelectedRadioValue('technical_flaws')) || 0,
        originality: parseInt(getSelectedRadioValue('originality')) || 0,
        emotional: parseInt(getSelectedRadioValue('emotional')) || 0,
        visualAppeal: parseInt(getSelectedRadioValue('visual_appeal')) || 0,
        deviceType: detectDeviceType()
    };

    // 保存评分
    experimentState.ratings.push(rating);

    // 更新本地存储
    const userData = JSON.parse(localStorage.getItem('userData')) || {};
    if (!userData.experimentData) userData.experimentData = {};
    if (!userData.experimentData.ratings) userData.experimentData.ratings = [];
    userData.experimentData.ratings.push(rating);

    // 保存当前进度
    userData.experimentData.currentProgress = {
        currentGroup: experimentState.currentGroup,
        currentIndex: experimentState.currentSequenceIndex,
        totalImages: experimentState.imagesSequence.length
    };

    localStorage.setItem('userData', JSON.stringify(userData));

    // 更新图片序列索引
    experimentState.currentSequenceIndex++;

    if (currentImage.type === 'attention') {
        // 如果当前图片为注意力检测图片，则在评分后显示注意力检测
        showAttentionCheck(currentImage);
    } else {
        // 否则，直接显示休息环节
        showRest();
    }
}

/**
 * 检测设备类型
 */
function detectDeviceType() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    // 检测移动设备
    if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())) {
        // 区分平板和手机
        if (/ipad/i.test(userAgent) ||
            (/android/i.test(userAgent) && !/mobile/i.test(userAgent)) ||
            window.innerWidth >= 768 && window.innerHeight >= 768) {
            return 'tablet';
        }
        return 'mobile';
    }

    // 将设备信息也保存到userData中
    const userData = JSON.parse(localStorage.getItem('userData')) || {};
    userData.deviceType = 'desktop'; // 默认为桌面端
    localStorage.setItem('userData', JSON.stringify(userData));

    return 'desktop';
}

// 在DOMContentLoaded事件中添加设备类型初始检测
document.addEventListener('DOMContentLoaded', () => {

    // 初始化检测设备类型并保存
    const userData = JSON.parse(localStorage.getItem('userData')) || {};
    userData.deviceType = detectDeviceType();
    localStorage.setItem('userData', JSON.stringify(userData));
});

/**
 * 完成实验
 */
function finishExperiment() {
    console.log('实验结束，准备跳转到反馈页面');
    
    // 保存所有数据
    const userData = JSON.parse(localStorage.getItem('userData')) || {};

    // 确保实验数据对象存在
    if (!userData.experimentData) {
        userData.experimentData = {};
    }

    // 将当前实验状态中的数据合并到userData中
    userData.experimentData.ratings = experimentState.ratings;
    userData.experimentData.attentionResults = experimentState.attentionResults;
    userData.experimentData.experimentEndTime = new Date().toISOString();

    // 保存到localStorage
    localStorage.setItem('userData', JSON.stringify(userData));

    // 自动保存数据为JSON文件
    exportAsJson(userData);

    // 尝试上传数据到服务器
    try {
        uploadExperimentData(userData);
    } catch (error) {
        console.error('上传数据失败:', error);
    }

    // 确保在所有处理完成后跳转
    setTimeout(() => {
        console.log('正在跳转到反馈页面...');
        window.location.href = 'feedback.html';
    }, 500);
}

/**
 * 将数据导出为JSON文件
 */
function exportAsJson(data) {
    try {
        // 将数据转换为JSON字符串
        const jsonString = JSON.stringify(data, null, 2);
        
        // 仅将JSON保存到服务器，而不下载文件
        console.log('实验数据已准备就绪，准备发送到服务器');
        
        // 这里只保留向服务器发送数据的部分
        sendDataToServer(data);
    } catch (error) {
        console.error('数据处理失败:', error);
    }
}

/**
 * 尝试将实验数据上传到服务器
 */
function uploadExperimentData(userData) {
    console.log('尝试上传数据到服务器');

    // 将数据发送到服务器
    fetch('/result', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
    })
    .then(response => response.json())
    .then(result => {
        console.log('数据上传成功:', result);
    })
    .catch(error => {
        console.error('数据上传失败:', error);
        // 上传失败时，确保本地文件保存成功
        console.log('尝试本地备份保存...');
    });
}
