/**
 * 主JavaScript文件，包含共享功能和非实验页面的逻辑
 */

// 用户数据存储对象
let userData = {
    basicInfo: {},
    experimentStartTime: null,
    experimentEndTime: null
};

// 当DOM加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 首先从localStorage加载现有的userData
    const savedData = localStorage.getItem('userData');
    if (savedData) {
        userData = JSON.parse(savedData);
    }

    // 检查当前页面并初始化相应功能
    const currentPage = window.location.pathname.split('/').pop();

    switch (currentPage) {
        case 'index.html':
        case '':
            initWelcomePage();
            break;
        case 'basic-info.html':
            initBasicInfoPage();
            break;
        case 'feedback.html':
            initFeedbackPage();
            break;
        default:
            // 其他页面不需要在main.js中处理
            break;
    }
});

/**
 * 初始化欢迎页面
 */
function initWelcomePage() {
    const consentCheckbox = document.getElementById('consent');
    const startButton = document.getElementById('start-btn');

    if (consentCheckbox && startButton) {
        // 同意复选框更改事件
        consentCheckbox.addEventListener('change', () => {
            startButton.disabled = !consentCheckbox.checked;
        });

        // 开始按钮点击事件
        startButton.addEventListener('click', () => {
            // 如果用户ID不存在，生成一个
            if (!userData.userId) {
                userData.userId = generateUserId();
            }
            // 记录实验开始时间
            userData.experimentStartTime = new Date().toISOString();
            // 保存到localStorage
            localStorage.setItem('userData', JSON.stringify(userData));
            // 修改：跳转到基本信息页面
            window.location.href = 'Information-Collection.html';
        });
    }
}

/**
 * 生成唯一用户ID - 保持与experiment.js中相同的生成方式
 */
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 初始化基本信息页面
 */
function initBasicInfoPage() {
    const startExperimentBtn = document.getElementById('start-experiment');

    if (startExperimentBtn) {
        startExperimentBtn.addEventListener('click', () => {
            // 跳转到实验页面
            window.location.href = 'experiment.html';
        });
    }
}

/**
 * 初始化反馈页面
 */
function initFeedbackPage() {
    // 计算实验持续时间
    if (userData.experimentStartTime) {
        const startTime = new Date(userData.experimentStartTime);
        const endTime = new Date(userData.experimentEndTime || new Date());
        const durationInMinutes = Math.round((endTime - startTime) / (1000 * 60));

        // 如果存在实验时长显示元素，则更新其内容
        const durationElement = document.getElementById('experiment-duration');
        if (durationElement) {
            durationElement.textContent = `${durationInMinutes} 分钟`;
        }
    }

    // 修改原有的反馈表单提交处理
    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 收集表单数据
            const formData = new FormData(feedbackForm);
            userData.feedback = {
                experience: formData.get('experience'),
                difficulty: formData.get('difficulty'),
                ai_art_experience: formData.get('ai_art_experience'),
                llm_opinion: formData.get('llm_opinion'),
                comments: formData.get('comments'),
                submittedAt: new Date().toISOString()
            };

            // 确保使用相同的用户ID
            userData.experimentEndTime = new Date().toISOString();

            // 保存到localStorage
            localStorage.setItem('userData', JSON.stringify(userData));

            // 显示提交中的消息
            const submitButton = feedbackForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = '提交中...';
            submitButton.disabled = true;

            // 尝试上传数据到服务器
            try {
                const response = await fetch('/save-feedback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: userData.userId, // 使用统一的用户ID
                        feedback: userData.feedback
                    })
                });

                if (response.ok) {
                    alert('感谢您的反馈！数据已成功提交。');
                    // 显示感谢信息
                    document.getElementById('feedback-container').style.display = 'none';
                    document.getElementById('thank-you-message').classList.remove('hidden');
                } else {
                    throw new Error('服务器响应错误');
                }
            } catch (error) {
                console.error('提交反馈失败:', error);
                alert('提交反馈时出现问题，但您的回答已在本地保存。');
            } finally {
                // 恢复按钮状态
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        });
    }
}

/**
 * 保存数据到服务器
 * @param {Object} data - 要保存的数据
 */
function sendDataToServer(data) {
    // 实际应用中，这里应该是一个AJAX请求
    console.log('数据已准备好发送到服务器:', data);

    fetch('http://127.0.0.1:5000', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(result => {
            console.log('数据提交成功:', result);
        })
        .catch(error => {
            console.error('数据提交失败:', error);
        });
}

// 在成功保存JSON文件后添加此函数调用
function processJSONToExcel() {
    // 使用fetch API调用后端处理脚本
    fetch('/process-json', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'process' }),
    })
        .then(response => response.json())
        .then(data => {
            console.log('JSON数据已成功转换为Excel:', data);
        })
        .catch(error => {
            console.error('转换过程出错:', error);
        });
}

// 修改原有的保存JSON函数，在保存后调用Excel转换
function saveExperimentData(experimentData) {
    // 原有的JSON保存代码
    localStorage.setItem('experimentData', JSON.stringify(experimentData));

    // 在成功保存JSON后添加:
    processJSONToExcel();
}
