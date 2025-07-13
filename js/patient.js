const PatientManager = (() => {
    const STORAGE_KEY = 'integratedMedicalAppPatients';
    let patients = [];
    let activePatientId = null;

    const load = () => {
        patients = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        activePatientId = localStorage.getItem('activePatientId') || null;
    };

    const save = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
        localStorage.setItem('activePatientId', activePatientId);
    };

    const createPatient = (name) => {
        const newPatient = {
            id: `patient_${Date.now()}`,
            name: name,
            createdAt: new Date().toISOString(),
            app1_data: {},
            app2_data: { selectionOrder: [], recordedDiagnoses: {}, selectedKeywords: {} },
            app3_data_list: []
        };
        patients.push(newPatient);
        save();
        return newPatient;
    };

    const getPatients = () => [...patients];
    
    const getActivePatient = () => patients.find(p => p.id === activePatientId) || null;

    const setActivePatientId = (id) => {
        activePatientId = id;
        save();
    };

    const updateActivePatientData = (appKey, data) => {
        const patient = getActivePatient();
        if (patient) {
            if (appKey === 'app3_data_list') {
                 // App3はリストなので、個別に追加・更新・削除が必要
                 // ここでは簡略化のため全置換
                 patient[appKey] = data;
            } else {
                patient[appKey] = { ...patient[appKey], ...data };
            }
            save();
        }
    };
    
    load(); // 初期ロード

    return {
        createPatient,
        getPatients,
        getActivePatient,
        setActivePatientId,
        updateActivePatientData,
    };
})();