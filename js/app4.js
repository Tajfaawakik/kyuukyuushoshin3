function initializeIntegrationApp() {
    const app4Container = document.getElementById('app4');
    const outputMemo = document.getElementById('output-memo-app4');
    const copyButton = document.getElementById('copy-button-app4');

    // --- データ集約と表示 ---
    const updateIntegratedOutput = () => {
        // App1のデータを取得
        const app1Output = document.getElementById('output-memo-app1')?.value || 'カルテ記載支援データがありません。';

        // App2のデータを取得
        const app2Output = document.getElementById('copy-textarea-app2')?.value || '症候鑑別支援データがありません。';
        
        // App3のデータを取得
        const app3Data = JSON.parse(localStorage.getItem('bloodTestData')) || [];
        let app3Output = '採血結果データがありません。';
        if (app3Data.length > 0) {
            app3Output = "■ 保存済み採血データ一覧\n";
            app3Data.sort((a, b) => new Date(b.testDate) - new Date(a.testDate));
            app3Data.forEach(data => {
                app3Output += `----------------------------------------\n`;
                app3Output += `患者ID: ${data.patientId || '未入力'} | 検査日: ${data.testDate || '未入力'}\n`;
                
                const resultsText = Object.entries(data.results)
                    .map(([key, value]) => ` - ${key}: ${value}`)
                    .join('\n');
                
                if (resultsText) {
                    app3Output += resultsText + '\n';
                }
                
                if (data.memo) {
                    app3Output += `メモ: ${data.memo}\n`;
                }
            });
        }
        
        // 全てのデータを結合
        const finalOutput = `
            

#   1.カルテ記載支援

${app1Output}


#   2.症候鑑別支援

${app2Output}


#   3.採血結果入力 

${app3Output}
        `.trim();

        outputMemo.value = finalOutput;
    };

    // main.jsから呼び出せるように、コンテナ要素に関数をアタッチ
    app4Container.update = updateIntegratedOutput;

    // --- コピー機能 ---
    const copyToClipboard = () => {
        if (!navigator.clipboard) {
            outputMemo.select();
            document.execCommand('copy');
            alert('コピーしました！');
        } else {
            navigator.clipboard.writeText(outputMemo.value).then(() => {
                const originalText = copyButton.textContent;
                copyButton.textContent = 'コピーしました！';
                setTimeout(() => {
                    copyButton.textContent = originalText;
                }, 1500);
            }).catch(err => {
                console.error('クリップボードへのコピーに失敗しました: ', err);
                alert('コピーに失敗しました。');
            });
        }
    };

    copyButton.addEventListener('click', copyToClipboard);
}