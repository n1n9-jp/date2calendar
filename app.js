document.addEventListener('DOMContentLoaded', async () => {
    const generateBtn = document.getElementById('generateBtn');
    const resultDiv = document.getElementById('result');
    let periodTimes = {};

    // 設定ファイルを読み込む
    try {
        const response = await fetch('config.json');
        if (!response.ok) {
            throw new Error('設定ファイル(config.json)が見つかりません。');
        }
        periodTimes = await response.json();
    } catch (error) {
        resultDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        generateBtn.disabled = true;
        return;
    }

    // DateオブジェクトをiCalendar形式のUTC日時に変換 (DTSTAMP用)
    const toUTCString = (date) => {
        return date.toISOString().replace(/[-:.]/g, '').slice(0, -4) + 'Z';
    };

    generateBtn.addEventListener('click', () => {
        const className = document.getElementById('className').value;
        const datesText = document.getElementById('eventDates').value;
        const checkedPeriods = document.querySelectorAll('input[type="checkbox"]:checked');

        const dates = datesText.split('\n').map(d => d.trim()).filter(d => d);

        if (!className || dates.length === 0 || checkedPeriods.length === 0) {
            resultDiv.innerHTML = `<div class="alert alert-danger">授業名、日付、時限をすべて入力してください。</div>`;
            return;
        }

        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Gemini//University Class Scheduler//EN',
            // 日本時間のタイムゾーン情報を定義
            'BEGIN:VTIMEZONE',
            'TZID:Asia/Tokyo',
            'BEGIN:STANDARD',
            'DTSTART:19390101T000000',
            'TZOFFSETFROM:+0900',
            'TZOFFSETTO:+0900',
            'TZNAME:JST',
            'END:STANDARD',
            'END:VTIMEZONE'
        ];

        const dtStamp = toUTCString(new Date());

        dates.forEach(date => {
            // 日付の妥当性をチェック
            if (isNaN(new Date(date).getTime())) {
                return; // 無効な日付はスキップ
            }

            checkedPeriods.forEach(checkbox => {
                const period = checkbox.value;
                const times = periodTimes[period];
                if (!times) return;

                const formatForJST = (d, t) => d.replace(/-/g, '') + 'T' + t.replace(/:/g, '') + '00';

                const startStr = formatForJST(date, times.start);
                const endStr = formatForJST(date, times.end);

                const event = [
                    'BEGIN:VEVENT',
                    `UID:${date}-${period}@gemini-cli`,
                    `DTSTAMP:${dtStamp}`,
                    // 各予定にタイムゾーンIDを指定
                    `DTSTART;TZID=Asia/Tokyo:${startStr}`,
                    `DTEND;TZID=Asia/Tokyo:${endStr}`,
                    `SUMMARY:${className} (${period}限)`,
                    'LOCATION:大学',
                    `DESCRIPTION:授業「${className}」の予定`,
                    'END:VEVENT'
                ];
                icsContent.push(...event);
            });
        });

        icsContent.push('END:VCALENDAR');

        // イベントが1つも生成されなかった場合
        if (icsContent.length <= 5) {
             resultDiv.innerHTML = `<div class="alert alert-warning">有効な日付が入力されていないため、カレンダーファイルを生成できませんでした。</div>`;
             return;
        }

        const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'schedule.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        resultDiv.innerHTML = `<div class="alert alert-success">カレンダーファイル(schedule.ics)のダウンロードを開始しました。</div>`;
    });
});