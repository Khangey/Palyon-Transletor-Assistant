document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const processBtn = document.getElementById('processBtn');
    const translationContainer = document.getElementById('translationContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const saveBtn = document.getElementById('saveBtn');
    
    let sentences = [];
    let currentInputIndex = 0;
    let hasUnsavedChanges = false;
    let autoSaveInterval;
    let lastSaveTime = Date.now();
    let saveCount = 0;  // 添加保存计数器
    let originalFileName = '';  // 添加原始文件名变量

    // 在开头添加标题处理代码
    const title = document.querySelector('h1');
    const text = title.textContent;
    const colors = [
        'var(--google-blue)',
        'var(--google-red)',
        'var(--google-yellow)',
        'var(--google-green)'
    ];
    
    title.innerHTML = Array.from(text).map((char, index) => 
        `<span style="color: ${colors[index % colors.length]}">${char}</span>`
    ).join('');

    // 文件处理
    processBtn.addEventListener('click', async function() {
        const file = fileInput.files[0];
        if (!file) {
            alert('ཡིག་ཆ་འདེམས་རོགས།');  // 请先选择文件
            return;
        }

        // 保存原始文件名（去除扩展名）
        originalFileName = file.name.replace(/\.[^/.]+$/, '');
        saveCount = 0;  // 重置保存计数器

        if (file.name.toLowerCase().endsWith('.txt')) {
            processTxtFile(file);
        } else if (file.name.toLowerCase().endsWith('.epub')) {
            await processEpubFile(file);
        }

        // 重置保存状态
        hasUnsavedChanges = false;
        lastSaveTime = Date.now();
    });

    // 处理 TXT 文件
    function processTxtFile(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            processSentences(text);
        };
        reader.readAsText(file);
    }

    // 处理 EPUB 文件 - 替代方案
    async function processEpubFile(file) {
        try {
            const zip = new JSZip();
            const contents = await zip.loadAsync(file);
            let text = '';
            
            // 遍历所有文件
            for (let filename of Object.keys(contents.files)) {
                // 只处理 HTML/XHTML 文件
                if (filename.match(/\.x?html?$/i)) {
                    const content = await contents.files[filename].async('text');
                    // 创建临时 DOM 元素来解析 HTML
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(content, 'text/html');
                    // 提取文本内容
                    text += doc.body.textContent + '\n';
                }
            }
            
            // 清理文本
            text = text.replace(/\s+/g, ' ').trim();
            
            if (!text) {
                throw new Error('ཡིག་ཆའི་ནང་དོན་ལེན་ཐུབ་མ་སོང་།');  // 未能提取到文本内容
            }
            
            processSentences(text);
        } catch (error) {
            console.error('EPUB ཡིག་ཆ་སྒྲིག་སྐབས་ནོར་འཁྲུལ་བྱུང་།:', error);  // 处理EPUB文件时出错
            alert('EPUB ཡིག་ཆ་སྒྲིག་སྐབས་ནོར་འཁྲུལ་བྱུང་། ཡིག་ཆའི་རྣམ་གཞག་ཞིབ་བཤེར་གནང་རོགས།\nནོར་འཁྲུལ་གནས་ཚུལ་: ' + error.message);
        }
    }

    // 处理文本分句
    function processSentences(text) {
        // 使用更复杂的分句规则
        sentences = text.split(/(?<=[。！？.!?])/g)
            .filter(sentence => sentence.trim())
            .map(sentence => sentence.trim());
        
        displaySentences();
    }

    // 显示句子和翻译输入框
    function displaySentences() {
        translationContainer.innerHTML = '';
        
        sentences.forEach((sentence, index) => {
            // 创建普通句子对
            const sentencePair = document.createElement('div');
            sentencePair.className = 'sentence-pair';
            
            const originalText = document.createElement('div');
            originalText.className = 'original-text';
            originalText.textContent = sentence;
            
            const translationInput = document.createElement('input');
            translationInput.type = 'text';
            translationInput.className = 'translation-input';
            translationInput.placeholder = 'ཡིག་སྒྱུར་འཇུག་རོགས།';
            translationInput.dataset.index = index;
            
            sentencePair.appendChild(originalText);
            sentencePair.appendChild(translationInput);
            
            translationContainer.appendChild(sentencePair);
        });

        // 添加输入监听
        document.querySelectorAll('.translation-input').forEach(input => {
            input.addEventListener('input', handleInputChange);
        });

        // 显示保存按钮
        saveBtn.style.display = 'inline-block';
        
        // 开始自动保存
        startAutoSave();
        
        // 聚焦第一个输入框
        if (sentences.length > 0) {
            const firstInput = document.querySelector('.translation-input');
            firstInput.focus();
        }
    }

    // 处理回车键事件
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const inputs = document.querySelectorAll('.translation-input');
            const currentInput = document.activeElement;
            
            if (currentInput.classList.contains('translation-input')) {
                const currentIndex = parseInt(currentInput.dataset.index);
                if (currentIndex < inputs.length - 1) {
                    inputs[currentIndex + 1].focus();
                }
            }
        }
    });

    // 在处理文件前
    loadingIndicator.style.display = 'block';

    // 在处理完成后
    loadingIndicator.style.display = 'none';

    // 添加自动保存功能
    function startAutoSave() {
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
        }
        autoSaveInterval = setInterval(saveTranslations, 5 * 60 * 1000); // 每5分钟
    }

    // 保存翻译内容
    function saveTranslations() {
        const translations = [];
        const inputs = document.querySelectorAll('.translation-input');
        const originals = document.querySelectorAll('.original-text');

        originals.forEach((original, index) => {
            translations.push({
                original: original.textContent,
                translation: inputs[index].value
            });
        });

        if (translations.length === 0) return;

        // 修改保存内容的格式，每行之间添加空行
        const content = translations.map(t => 
            `${t.original}\n\n${t.translation || ''}\n\n`  // 在每行后添加空行
        ).join('');

        // 增加保存计数
        saveCount++;

        // 创建文件名：原文件名_保存次数
        const saveFileName = `${originalFileName}_${saveCount}`;

        // 创建并下载文件
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = saveFileName + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);

        // 显示保存提示
        showSaveIndicator();
        
        hasUnsavedChanges = false;
        lastSaveTime = Date.now();
    }

    // 显示保存提示
    function showSaveIndicator() {
        let indicator = document.querySelector('.save-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'save-indicator';
            document.body.appendChild(indicator);
        }
        indicator.textContent = 'ཡིག་སྒྱུར་ཉར་ཚགས་བྱས་ཟིན།';  // 已保存翻译内容
        indicator.style.display = 'block';
        
        setTimeout(() => {
            indicator.style.display = 'none';
        }, 2000);
    }

    // 监听输入变化
    function handleInputChange() {
        hasUnsavedChanges = true;
        saveBtn.style.display = 'inline-block';
    }

    // 添加保存按钮事件监听
    saveBtn.addEventListener('click', saveTranslations);

    // 添加页面关闭提醒
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'ཡིག་སྒྱུར་ཉར་ཚགས་བྱས་མེད། ཕྱིར་འཐེན་བྱེད་དམ།';  // 您有未保存的翻译内容，确定要离开吗？
            return e.returnValue;
        }
    });

    // 清理函数
    function cleanup() {
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
        }
    }

    // 页面卸载时清理
    window.addEventListener('unload', cleanup);
}); 