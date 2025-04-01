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
            // 记录实验开始时间
            userData.experimentStartTime = new Date().toISOString();
            // 保存到localStorage
            localStorage.setItem('userData', JSON.stringify(userData));
            // 修改：跳转到基本信息页面
            window.location.href = 'basic-info.html';
        });
    }
}

/**
 * 初始化基本信息页面
 */
function initBasicInfoPage() {
    const startExperimentBtn = document.getElementById('start-experiment');
    
    if (startExperimentBtn) {
        startExperimentBtn.addEventListener('click', () => {
            // 跳转到实验页面
            window.location.href = 'Information-Collection.html';
        });
    }
}

/**
 * 初始化反馈页面
 */
function initFeedbackPage() {
    // 从localStorage加载用户数据
    const savedData = localStorage.getItem('userData');
    if (savedData) {
        userData = JSON.parse(savedData);
    }
    
    // 记录实验结束时间
    userData.experimentEndTime = new Date().toISOString();
    
    // 计算实验持续时间
    if (userData.experimentStartTime) {
        const startTime = new Date(userData.experimentStartTime);
        const endTime = new Date(userData.experimentEndTime);
        const durationInMinutes = Math.round((endTime - startTime) / (1000 * 60));
        
        // 如果存在实验时长显示元素，则更新其内容
        const durationElement = document.getElementById('experiment-duration');
        if (durationElement) {
            durationElement.textContent = `${durationInMinutes} 分钟`;
        }
    }
    
    // 处理反馈表单提交
    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // 收集表单数据
            const formData = new FormData(feedbackForm);
            userData.feedback = {
                experience: formData.get('experience'),
                difficulty: formData.get('difficulty'),
                comments: formData.get('comments')
            };
            
            // 保存完整数据
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // 这里添加数据提交到服务器的代码
            // 例如: sendDataToServer(userData);
            
            // 显示感谢信息
            const formContainer = document.getElementById('feedback-container');
            const thankYouMessage = document.getElementById('thank-you-message');
            
            if (formContainer && thankYouMessage) {
                formContainer.classList.add('hidden');
                thankYouMessage.classList.remove('hidden');
            }
        });
    }
}

/**
 * 保存数据到服务器（示例函数，需要后端支持）
 * @param {Object} data - 要保存的数据
 */
function sendDataToServer(data) {
    // 实际应用中，这里应该是一个AJAX请求
    console.log('数据已准备好发送到服务器:', data);
    
    // 示例AJAX请求
    /*
    fetch('https://your-api.example.com/submit-data', {
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
    */
}