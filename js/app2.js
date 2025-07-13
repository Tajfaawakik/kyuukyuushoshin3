function initializeDiagnosisSupportApp() {
    const symptomSelect = document.getElementById('symptom-select');
    const resultsContainer = document.getElementById('results-container');
    const selectedKeywordsContainer = document.getElementById('selected-keywords-tags');
    const copyTextArea = document.getElementById('copy-textarea-app2');
    const copyButton = document.getElementById('copy-button-app2');

    let medicalData = [];
    let keywordsForDetection = [];
    let selectionOrder = [];
    let lastSelectedSet = new Set();
    let pinnedItems = new Map();
    let selectedKeywords = new Set();
    let recordedDiagnoses = new Map();

    // ===== データロード・セーブ関数 =====
    const loadData = (patient) => {
        if (!patient || !patient.app2_data) return;
        const data = patient.app2_data;
        selectionOrder = Array.isArray(data.selectionOrder) ? [...data.selectionOrder] : [];
        lastSelectedSet = new Set(selectionOrder);
        pinnedItems = new Map(Object.entries(data.pinnedItems || {}).map(([k, v]) => [k, new Set(v)]));
        selectedKeywords = new Set(data.selectedKeywords || []);
        recordedDiagnoses = new Map(Object.entries(data.recordedDiagnoses || {}).map(([k, v]) => [k, new Set(v)]));
        render();
    };

    const saveData = () => {
        const data = {
            selectionOrder,
            pinnedItems: Object.fromEntries(Array.from(pinnedItems.entries()).map(([k, v]) => [k, Array.from(v)])),
            selectedKeywords: Array.from(selectedKeywords),
            recordedDiagnoses: Object.fromEntries(Array.from(recordedDiagnoses.entries()).map(([k, v]) => [k, Array.from(v)])),
        };
        if (window.PatientManager && typeof window.PatientManager.updateActivePatientData === 'function') {
            window.PatientManager.updateActivePatientData('app2_data', data);
        }
    };

    async function loadDataAndInitialize() {
        try {
            const [medicalResponse, keywordsResponse] = await Promise.all([
                fetch('data/medicalData.json'),
                fetch('data/symptomKeywords.json')
            ]);
            medicalData = await medicalResponse.json();
            keywordsForDetection = await keywordsResponse.json();
            initialize();
        } catch (error) {
            console.error('データの読み込みに失敗しました:', error);
            resultsContainer.innerHTML = '<p style="color: red;">アプリケーションデータの読み込みに失敗しました。</p>';
        }
    }

    function initialize() {
        populateSymptomDropdown();
        symptomSelect.addEventListener('change', () => { handleSymptomSelectionChange(); saveData(); });
        selectedKeywordsContainer.addEventListener('click', (e) => { handleTagClick(e); saveData(); });
        resultsContainer.addEventListener('click', (e) => { handleCardClick(e); saveData(); });
        copyButton.addEventListener('click', handleCopyButtonClick);
        render();
        saveData();
    }

    function handleSymptomSelectionChange() {
        const currentSelectedSet = new Set(Array.from(symptomSelect.selectedOptions).map(opt => opt.value));
        selectionOrder = selectionOrder.filter(symptom => currentSelectedSet.has(symptom));
        currentSelectedSet.forEach(symptom => {
            if (!lastSelectedSet.has(symptom)) {
                selectionOrder.push(symptom);
            }
        });
        lastSelectedSet = currentSelectedSet;
        render();
    }

    function populateSymptomDropdown() {
        if(symptomSelect.options.length > 0) return;
        
        const symptoms = medicalData.map(item => item.symptom);
        const uniqueSymptoms = [...new Set(symptoms)];
        uniqueSymptoms.forEach(symptom => {
            const option = document.createElement('option');
            option.value = symptom;
            option.textContent = symptom;
            symptomSelect.appendChild(option);
        });
    }

    function render() {
        renderResults();
        renderSelectedKeywordTags();
        updateCopyTextArea();
    }

    function renderResults() {
        resultsContainer.innerHTML = '';
        if (selectionOrder.length === 0) {
            resultsContainer.innerHTML = '<p>症候を選択すると、ここに関連する鑑別疾患が表示されます。</p>';
            return;
        }

        selectionOrder.forEach((symptomName, index) => {
            const symptomData = medicalData.find(d => d.symptom === symptomName);
            if (!symptomData) return;

            const groupDiv = document.createElement('div');
            groupDiv.className = 'symptom-group';
            groupDiv.dataset.symptomName = symptomName;
            if (index === 0) {
                groupDiv.classList.add('primary');
            }

            const title = document.createElement('h2');
            title.textContent = `${symptomName} の鑑別疾患`;
            if (index === 0) {
                const badge = document.createElement('span');
                badge.className = 'primary-badge';
                badge.textContent = '主訴';
                title.appendChild(badge);
            }
            groupDiv.appendChild(title);
            
            const pinnedSet = pinnedItems.get(symptomName) || new Set();
            const sortedDiagnoses = [...symptomData.differential_diagnoses].sort((a, b) => {
                const aIsPinned = pinnedSet.has(a.name);
                const bIsPinned = pinnedSet.has(b.name);
                if (aIsPinned && !bIsPinned) return -1;
                if (!aIsPinned && bIsPinned) return 1;
                return 0;
            });

            if (sortedDiagnoses.length === 0) {
                groupDiv.appendChild(document.createElement('p')).textContent = 'この症候に関連する鑑別疾患は見つかりませんでした。';
            } else {
                sortedDiagnoses.forEach(disease => {
                    const card = createDiseaseCard(disease, symptomName);
                    groupDiv.appendChild(card);
                });
            }
            resultsContainer.appendChild(groupDiv);
        });
    }

    function createDiseaseCard(disease, symptomName) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'disease-card';
        const isPinned = pinnedItems.get(symptomName)?.has(disease.name);
        if (isPinned) cardDiv.classList.add('pinned');

        const cardHeader = document.createElement('div');
        cardHeader.className = 'disease-card-header';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'diagnosis-checkbox';
        checkbox.dataset.diseaseName = disease.name;
        checkbox.checked = recordedDiagnoses.get(symptomName)?.has(disease.name) || false;
        cardHeader.appendChild(checkbox);

        const diseaseNameEl = document.createElement('h3');
        diseaseNameEl.textContent = disease.name;
        cardHeader.appendChild(diseaseNameEl);

        const pinButton = document.createElement('button');
        pinButton.className = 'pin-button';
        pinButton.textContent = '📌';
        pinButton.dataset.diseaseName = disease.name;
        pinButton.title = '最上位に固定/解除';
        if (isPinned) pinButton.classList.add('pinned');
        cardHeader.appendChild(pinButton);
        cardDiv.appendChild(cardHeader);

        const interviewTitle = document.createElement('h4');
        interviewTitle.textContent = '医療面接のポイント';
        cardDiv.appendChild(interviewTitle);
        disease.interview_points.forEach(point => cardDiv.appendChild(document.createElement('p')).innerHTML = highlightKeywords(point));

        const examTitle = document.createElement('h4');
        examTitle.textContent = '身体診察のポイント';
        cardDiv.appendChild(examTitle);
        disease.physical_exam_points.forEach(point => cardDiv.appendChild(document.createElement('p')).innerHTML = highlightKeywords(point));

        return cardDiv;
    }

    function highlightKeywords(text) {
        if (!Array.isArray(keywordsForDetection)) return text;
        let highlightedText = text;
        keywordsForDetection.forEach(keyword => {
            if (!keyword?.trim()) return;
            const isHighlighted = selectedKeywords.has(keyword) ? 'highlighted' : '';
            try {
                const regex = new RegExp(keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
                highlightedText = highlightedText.replace(regex, match => {
                    if (highlightedText.includes(`<span class="clickable-keyword`)) {
                        const tempText = highlightedText.substring(0, highlightedText.indexOf(match));
                        if ((tempText.match(/<span/g) || []).length > (tempText.match(/<\/span>/g) || []).length) return match;
                    }
                    return `<span class="clickable-keyword ${isHighlighted}" data-keyword="${match}">${match}</span>`;
                });
            } catch (e) { console.error("Invalid regex pattern for keyword:", keyword); }
        });
        return highlightedText;
    }
    
    function handleCardClick(event) {
        const keywordTarget = event.target.closest('.clickable-keyword');
        const pinTarget = event.target.closest('.pin-button');
        const checkboxTarget = event.target.closest('.diagnosis-checkbox');

        if (keywordTarget) handleKeywordClick(keywordTarget);
        else if (pinTarget) handlePinClick(pinTarget);
        else if (checkboxTarget) handleDiagnosisRecord(checkboxTarget);
    }

    function handleDiagnosisRecord(target) {
        const diseaseName = target.dataset.diseaseName;
        const symptomName = target.closest('.symptom-group').dataset.symptomName;
        if (!recordedDiagnoses.has(symptomName)) {
            recordedDiagnoses.set(symptomName, new Set());
        }
        const recordedSet = recordedDiagnoses.get(symptomName);
        if (target.checked) {
            recordedSet.add(diseaseName);
        } else {
            recordedSet.delete(diseaseName);
        }
        updateCopyTextArea();
    }

    function handleKeywordClick(target) {
        const keyword = target.dataset.keyword;
        if (selectedKeywords.has(keyword)) {
            selectedKeywords.delete(keyword);
        } else {
            selectedKeywords.add(keyword);
        }
        render();
    }
    
    function handlePinClick(target) {
        const diseaseName = target.dataset.diseaseName;
        const symptomName = target.closest('.symptom-group').dataset.symptomName;
        if (!pinnedItems.has(symptomName)) {
            pinnedItems.set(symptomName, new Set());
        }
        const pinnedSet = pinnedItems.get(symptomName);
        if (pinnedSet.has(diseaseName)) {
            pinnedSet.delete(diseaseName);
        } else {
            pinnedSet.add(diseaseName);
        }
        render();
    }
    
    function handleTagClick(event) {
        const target = event.target.closest('.keyword-tag');
        if (target) {
            const keyword = target.dataset.keyword;
            if (keyword && selectedKeywords.has(keyword)) {
                selectedKeywords.delete(keyword);
                render();
            }
        }
    }
    
    function handleCopyButtonClick() {
        if (!copyTextArea.value) return;
        navigator.clipboard.writeText(copyTextArea.value).then(() => {
            const originalText = copyButton.textContent;
            copyButton.textContent = 'コピーしました！';
            setTimeout(() => {
                copyButton.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('クリップボードへのコピーに失敗しました: ', err);
            alert('コピーに失敗しました。');
        });
    }

    function renderSelectedKeywordTags() {
        selectedKeywordsContainer.innerHTML = '';
        if (selectedKeywords.size === 0) {
            selectedKeywordsContainer.innerHTML = '<span>なし</span>';
            return;
        }
        selectedKeywords.forEach(keyword => {
            const tag = document.createElement('span');
            tag.className = 'keyword-tag';
            tag.textContent = keyword;
            tag.dataset.keyword = keyword;
            tag.title = 'クリックして選択解除';
            tag.appendChild(document.createElement('span')).className = 'remove-tag';
            selectedKeywordsContainer.appendChild(tag);
        });
    }

    function updateCopyTextArea() {
        let text = '';
        if (selectionOrder.length > 0) {
            text += '■ 症候\n';
            text += `主訴: ${selectionOrder[0]}\n`;
            if (selectionOrder.length > 1) {
                text += `その他: ${selectionOrder.slice(1).join(', ')}\n`;
            }
            text += '\n';
        }
        if (recordedDiagnoses.size > 0) {
            let hasRecorded = false;
            let diagnosisText = '■ 鑑別疾患\n';
            recordedDiagnoses.forEach((diseases, symptom) => {
                if (diseases.size > 0) {
                    hasRecorded = true;
                    diagnosisText += `# ${symptom}\n`;
                    diseases.forEach(disease => {
                        diagnosisText += `- ${disease}\n`;
                    });
                }
            });
            if(hasRecorded) text += diagnosisText + '\n';
        }
        if (selectedKeywords.size > 0) {
            text += '■ 選択キーワード (身体所見など)\n';
            selectedKeywords.forEach(keyword => {
                text += `- ${keyword}\n`;
            });
            text += '\n';
        }
        copyTextArea.value = text.trim();
    }
    loadDataAndInitialize();
    // main.jsから呼び出せるようにする
    document.getElementById('app2').load = loadData;
}