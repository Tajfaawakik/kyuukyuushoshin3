function initializeChartSupportApp() {
    // ===== DOM要素の取得 =====
    const formElements = {
        name: document.getElementById('name'),
        age: document.getElementById('age'),
        genderGroup: document.getElementById('gender'),
        historyTags: document.getElementById('history-tags'),
        surgeryHistory: document.getElementById('surgery-history'),
        allergyTags: document.getElementById('allergy-tags'),
        otherAllergies: document.getElementById('other-allergies'),
        medSuggestionContainer: document.getElementById('med-suggestion-tags'),
        medListContainer: document.getElementById('medication-list'),
        addMedRowBtn: document.getElementById('add-med-row'),
        smokingStatusGroup: document.getElementById('smoking-status'),
        smokingDetailsContainer: document.getElementById('smoking-details'),
        drinkingStatusGroup: document.getElementById('drinking-status'),
        drinkingDetailsContainer: document.getElementById('drinking-details'),
        adlAssessmentContainer: document.getElementById('adl-assessment'),
        adlScoreDisplay: document.getElementById('adl-score'),
        outputMemo: document.getElementById('output-memo-app1'),
        copyBtn: document.getElementById('copy-button-app1')
    };

    // ===== データロード・セーブ関数 =====
    const loadData = (patient) => {
        if (!patient || !patient.app1_data) return;
        const data = patient.app1_data;
        formElements.name.value = data.name || '';
        formElements.age.value = data.age || '';
        // 性別
        Array.from(formElements.genderGroup.querySelectorAll('button')).forEach(btn => {
            btn.classList.toggle('active', data.gender && data.gender.includes(btn.dataset.value));
        });
        // 既往歴
        Array.from(formElements.historyTags.querySelectorAll('button')).forEach(btn => {
            btn.classList.toggle('active', data.histories && data.histories.includes(btn.dataset.value));
        });
        formElements.surgeryHistory.value = data.surgery || '';
        // アレルギー
        Array.from(formElements.allergyTags.querySelectorAll('button')).forEach(btn => {
            btn.classList.toggle('active', data.allergies && data.allergies.includes(btn.dataset.value));
        });
        formElements.otherAllergies.value = data.otherAllergies || '';
        // 内服薬
        formElements.medListContainer.innerHTML = '';
        if (data.medications && Array.isArray(data.medications)) {
            data.medications.forEach(med => {
                const [name, ...usageArr] = med.split(' ');
                addMedicationRow(name, usageArr.join(' '));
            });
        }
        // 喫煙
        Array.from(formElements.smokingStatusGroup.querySelectorAll('button')).forEach(btn => {
            btn.classList.toggle('active', data.smokingStatus && data.smokingStatus.includes(btn.dataset.value));
        });
        handleSmokingDetails(formElements.smokingStatusGroup.querySelector('button.active'));
        if (data.smokingStatus && data.smokingStatus !== 'なし') {
            document.getElementById('smoking-years')?.value = data.smokingYears || '';
            document.getElementById('smoking-amount')?.value = data.smokingAmount || '';
        }
        // 飲酒
        Array.from(formElements.drinkingStatusGroup.querySelectorAll('button')).forEach(btn => {
            btn.classList.toggle('active', data.drinkingStatus && data.drinkingStatus.includes(btn.dataset.value));
        });
        handleDrinkingDetails(formElements.drinkingStatusGroup.querySelector('button.active'));
        if (data.drinkingStatus && data.drinkingStatus !== 'なし') {
            document.getElementById('drinking-type')?.value = data.drinkingType || '';
            document.getElementById('drinking-amount')?.value = data.drinkingAmount || '';
        }
        // ADL
        formElements.adlAssessmentContainer.querySelectorAll('select').forEach((select, idx) => {
            select.value = data.adlValues && data.adlValues[idx] !== undefined ? data.adlValues[idx] : select.options[0].value;
        });
        updateOutput();
    };

    const saveData = () => {
        const adlValues = Array.from(formElements.adlAssessmentContainer.querySelectorAll('select')).map(sel => sel.value);
        const data = {
            name: formElements.name.value,
            age: formElements.age.value,
            gender: getActiveButtonValues(formElements.genderGroup),
            histories: getActiveButtonValues(formElements.historyTags),
            surgery: formElements.surgeryHistory.value,
            allergies: getActiveButtonValues(formElements.allergyTags),
            otherAllergies: formElements.otherAllergies.value,
            medications: Array.from(formElements.medListContainer.querySelectorAll('.med-row')).map(row => {
                const name = row.querySelector('.med-name').value;
                const usage = row.querySelector('.med-usage').value;
                return `${name} ${usage}`.trim();
            }).filter(med => med),
            smokingStatus: getActiveButtonValues(formElements.smokingStatusGroup),
            smokingYears: document.getElementById('smoking-years')?.value || '',
            smokingAmount: document.getElementById('smoking-amount')?.value || '',
            drinkingStatus: getActiveButtonValues(formElements.drinkingStatusGroup),
            drinkingType: document.getElementById('drinking-type')?.value || '',
            drinkingAmount: document.getElementById('drinking-amount')?.value || '',
            adlValues,
        };
        if (window.PatientManager && typeof window.PatientManager.updateActivePatientData === 'function') {
            window.PatientManager.updateActivePatientData('app1_data', data);
        }
    };

    const adlItems = [
            { label: '食事', points: [10, 5, 0], options: ['自立', '一部介助', '全介助'] },
            { label: '移乗', points: [15, 10, 5, 0], options: ['自立', '監視/助言', '一部介助', '全介助'] },
            { label: '整容', points: [5, 0], options: ['自立', '全介助'] },
            { label: 'トイレ動作', points: [10, 5, 0], options: ['自立', '一部介助', '全介助'] },
            { label: '入浴', points: [5, 0], options: ['自立', '全介助'] },
            { label: '歩行', points: [15, 10, 5, 0], options: ['45m以上自立', '45m以上要介助', '歩行不能だが車椅子自立', '全介助'] },
            { label: '階段昇降', points: [10, 5, 0], options: ['自立', '要介助', '不能'] },
            { label: '着替え', points: [10, 5, 0], options: ['自立', '一部介助', '全介助'] },
            { label: '排便管理', points: [10, 5, 0], options: ['失禁なし', '時々失禁', '失禁あり'] },
            { label: '排尿管理', points: [10, 5, 0], options: ['失禁なし', '時々失禁', '失禁あり'] },
    ];
    
    let historyList = [];
    let medSuggestions = {};

    async function initialize() {
        try {
            const [historiesRes, medsRes] = await Promise.all([
                fetch('data/histories.json'),
                fetch('data/med_suggestions.json')
            ]);
            historyList = await historiesRes.json();
            medSuggestions = await medsRes.json();
        } catch (error) {
            console.error('設定ファイルの読み込みに失敗しました:', error);
            alert('設定ファイルの読み込みに失敗しました。');
            return;
        }

        historyList.forEach(history => {
            const button = document.createElement('button');
            button.dataset.value = history;
            button.textContent = history;
            formElements.historyTags.appendChild(button);
        });

        adlItems.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'adl-item';
            const label = document.createElement('label');
            label.textContent = item.label;
            const select = document.createElement('select');
            select.dataset.index = index;
            item.options.forEach((opt, optIndex) => {
                const option = document.createElement('option');
                option.value = item.points[optIndex];
                option.textContent = `${opt} (${option.value}点)`;
                select.appendChild(option);
            });
            div.appendChild(label);
            div.appendChild(select);
            formElements.adlAssessmentContainer.appendChild(div);
        });

        document.querySelector('#app1 .container-app1').addEventListener('input', () => {
            updateOutput();
            saveData();
        });
        document.querySelector('#app1 .container-app1').addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && !e.target.id.includes('copy') && !e.target.id.includes('add')) {
                if(e.target.parentElement.classList.contains('button-group')) {
                    e.target.classList.toggle('active');
                }
                if(e.target.parentElement.id === 'med-suggestion-tags') {
                    toggleMedication(e.target.dataset.value);
                }
                if(e.target.parentElement.id === 'smoking-status') handleSmokingDetails(e.target);
                if(e.target.parentElement.id === 'drinking-status') handleDrinkingDetails(e.target);
                updateOutput();
                saveData();
            }
        });

        formElements.addMedRowBtn.addEventListener('click', () => {
            addMedicationRow();
            saveData();
        });
        formElements.medListContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-button')) {
                e.target.closest('.med-row').remove();
                updateOutput();
                saveData();
            }
        });
        formElements.copyBtn.addEventListener('click', copyToClipboard);
        updateOutput();
        saveData();
    }

    function getActiveButtonValues(groupElement) {
        return Array.from(groupElement.querySelectorAll('button.active')).map(btn => btn.dataset.value);
    }

    function toggleMedication(medName) {
        const existingMeds = Array.from(formElements.medListContainer.querySelectorAll('input[type="text"]')).map(input => input.value);
        if (existingMeds.includes(medName)) {
            formElements.medListContainer.querySelectorAll('.med-row').forEach(row => {
                if (row.querySelector('input[type="text"]').value === medName) {
                    row.remove();
                }
            });
        } else {
            addMedicationRow(medName);
        }
    }
    
    function addMedicationRow(name = '', usage = '') {
        const div = document.createElement('div');
        div.className = 'med-row';
        div.innerHTML = `
            <input type="text" class="med-name" placeholder="薬剤名" value="${name}">
            <input type="text" class="med-usage" placeholder="用法・用量" value="${usage}">
            <button class="delete-button">×</button>
        `;
        formElements.medListContainer.appendChild(div);
    }
    
    function handleSmokingDetails(targetButton) {
        const value = targetButton.dataset.value;
        if(value === 'なし' || targetButton.classList.contains('active')) {
             formElements.smokingDetailsContainer.innerHTML = '';
        } else {
            formElements.smokingDetailsContainer.innerHTML = `
                <input type="number" id="smoking-years" placeholder="年数"> 年間
                <input type="number" id="smoking-amount" placeholder="本数"> 本/日
            `;
        }
    }
    
    function handleDrinkingDetails(targetButton) {
        const value = targetButton.dataset.value;
         if(value === 'なし' || targetButton.classList.contains('active')) {
            formElements.drinkingDetailsContainer.innerHTML = '';
        } else {
            formElements.drinkingDetailsContainer.innerHTML = `
                <input type="text" id="drinking-type" placeholder="種類（ビール, 日本酒など）">
                <input type="text" id="drinking-amount" placeholder="量（350ml/日など）">
            `;
        }
    }

    function calculateAdlScore() {
        let total = 0;
        formElements.adlAssessmentContainer.querySelectorAll('select').forEach(select => {
            total += Number(select.value);
        });
        formElements.adlScoreDisplay.textContent = `ADL合計: ${total} / 100点`;
        return total;
    }

    function updateMedSuggestions(histories) {
        formElements.medSuggestionContainer.innerHTML = '';
        const suggestions = new Set();
        histories.forEach(history => {
            if(medSuggestions[history]) {
                medSuggestions[history].forEach(med => suggestions.add(med));
            }
        });
        
        suggestions.forEach(med => {
            const btn = document.createElement('button');
            btn.dataset.value = med;
            btn.textContent = med;
            formElements.medSuggestionContainer.appendChild(btn);
        });
    }

    function updateOutput() {
        const values = {
            name: formElements.name.value,
            age: formElements.age.value,
            gender: getActiveButtonValues(formElements.genderGroup).join(', '),
            histories: getActiveButtonValues(formElements.historyTags),
            surgery: formElements.surgeryHistory.value,
            allergies: getActiveButtonValues(formElements.allergyTags).join(', ') || '特になし',
            otherAllergies: formElements.otherAllergies.value,
            medications: Array.from(formElements.medListContainer.querySelectorAll('.med-row')).map(row => {
                const name = row.querySelector('.med-name').value;
                const usage = row.querySelector('.med-usage').value;
                return `${name} ${usage}`.trim();
            }).filter(med => med),
            smokingStatus: getActiveButtonValues(formElements.smokingStatusGroup).join(''),
            drinkingStatus: getActiveButtonValues(formElements.drinkingStatusGroup).join(''),
            adlScore: calculateAdlScore()
        };

        updateMedSuggestions(values.histories);

        let smokingText = values.smokingStatus;
        if (smokingText && smokingText !== 'なし') {
            const years = document.getElementById('smoking-years')?.value || '';
            const amount = document.getElementById('smoking-amount')?.value || '';
            smokingText += ` (${amount}本/日 x ${years}年)`;
        }
        
        let drinkingText = values.drinkingStatus;
        if (drinkingText && drinkingText !== 'なし') {
            const type = document.getElementById('drinking-type')?.value || '';
            const amount = document.getElementById('drinking-amount')?.value || '';
            drinkingText += ` (${type}を${amount})`;
        }

        // ★★★ カルテ用メモ出力の順序を修正 ★★★
        const output = `
【患者情報】
氏名：${values.name || '未入力'} 様
年齢：${values.age || '未入力'} 歳
性別：${values.gender || '未選択'}

【既往歴】
・${values.histories.join('、') || '特記事項なし'}
${values.surgery ? '・手術歴/特記事項：' + values.surgery : ''}

【内服薬】
${values.medications.length > 0 ? values.medications.map(m => `・${m}`).join('\n') : '・なし'}

【アレルギー】
・${values.allergies}
${values.otherAllergies ? '・その他：' + values.otherAllergies : ''}

【生活歴】
喫煙：${smokingText || '未選択'}
飲酒：${drinkingText || '未選択'}

【ADL】
Barthel Index: ${values.adlScore}点
        `.trim();

        formElements.outputMemo.value = output;
    }

    function copyToClipboard() {
        if (!navigator.clipboard) {
            formElements.outputMemo.select();
            document.execCommand('copy');
        } else {
            navigator.clipboard.writeText(formElements.outputMemo.value).catch(err => {
                console.error('クリップボードへのコピーに失敗しました: ', err);
            });
        }
        formElements.copyBtn.textContent = 'コピーしました！';
        setTimeout(() => {
            formElements.copyBtn.textContent = 'クリップボードにコピー';
        }, 1500);
    }

    initialize();
    // main.jsから呼び出せるようにする
    document.getElementById('app1').load = loadData;
}