const UIManager = (() => {
    const patientModal = document.getElementById('patient-modal');
    const patientList = document.getElementById('patient-list');
    const activePatientDisplay = document.getElementById('active-patient-display');
    const navButtons = document.querySelectorAll('.nav-button');

    const renderPatientList = (patients) => {
        patientList.innerHTML = '';
        if (patients.length === 0) {
            patientList.innerHTML = '<p>患者データがありません。新規作成してください。</p>';
            return;
        }
        patients.forEach(patient => {
            const item = document.createElement('div');
            item.className = 'patient-item';
            item.dataset.id = patient.id;
            item.innerHTML = `
                <span class="patient-item-name">${patient.name}</span>
                <span class="patient-item-date">作成日: ${new Date(patient.createdAt).toLocaleDateString()}</span>
            `;
            patientList.appendChild(item);
        });
    };
    
     // 患者選択画面とメインアプリ画面を切り替える
    const showMainApp = (show = true) => {
        // ... (この関数の中身は変更なし) ...
        setNavButtonsDisabled(!show); // ★★★ 連動してボタンの有効/無効を切り替え ★★★
    };

    const setNavButtonsDisabled = (disabled = true) => {
        navButtons.forEach(btn => btn.disabled = disabled);
    };

    // // 患者選択モーダルの表示・非表示を切り替える
    // const showPatientModal = (show = true) => {
    //     patientModal.classList.toggle('active', show);
    // };

    const updateActivePatientDisplay = (patient) => {
        if (patient) {
            activePatientDisplay.innerHTML = `
                <span>作業中: <strong>${patient.name}</strong></span>
                <button id="change-patient-button">患者切替</button>
            `;
        } else {
            activePatientDisplay.innerHTML = '<span>患者が選択されていません</span>';
        }
    };
    
    

    return {
        renderPatientList,
        // showPatientModal,
        showMainApp,
        updateActivePatientDisplay,
        setNavButtonsDisabled,
    };
})();