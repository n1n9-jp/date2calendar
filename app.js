document.addEventListener('DOMContentLoaded', async () => {
    const generateBtn = document.getElementById('generateBtn');
    const resultDiv = document.getElementById('result');
    const universitySelect = document.getElementById('university');
    const periodsContainer = document.getElementById('periodsContainer');
    let universities = {};
    let selectedUniversity = null;

    // 設定ファイルを読み込む
    try {
        const response = await fetch('config.json');
        if (!response.ok) {
            throw new Error('設定ファイル(config.json)が見つかりません。');
        }
        universities = await response.json();
    } catch (error) {
        resultDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        generateBtn.disabled = true;
        return;
    }

    // ドロップダウンに大学を追加
    Object.entries(universities).forEach(([key, value]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = value.name;
        universitySelect.appendChild(option);
    });

    // 大学選択時の処理
    universitySelect.addEventListener('change', (e) => {
        selectedUniversity = e.target.value;
        periodsContainer.innerHTML = '';

        if (!selectedUniversity) {
            periodsContainer.innerHTML = '<p class="text-muted small">大学を選択してください</p>';
            return;
        }

        const university = universities[selectedUniversity];
        const periodsDiv = document.createElement('div');

        Object.entries(university.periods).forEach(([period, times]) => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'form-check form-check-inline';

            const checkbox = document.createElement('input');
            checkbox.className = 'form-check-input';
            checkbox.type = 'checkbox';
            checkbox.id = `period${period}`;
            checkbox.value = period;

            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.setAttribute('for', `period${period}`);
            label.textContent = `${period}限 (${times.start}-${times.end})`;

            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            periodsDiv.appendChild(checkboxDiv);
        });

        periodsContainer.appendChild(periodsDiv);
    });

    // DateオブジェクトをiCalendar形式のUTC日時に変換 (DTSTAMP用)
    const toUTCString = (date) => {
        return date.toISOString().replace(/[-:.]/g, '').slice(0, -4) + 'Z';
    };

    generateBtn.addEventListener('click', () => {
        const className = document.getElementById('className').value;
        const datesText = document.getElementById('eventDates').value;
        const checkedPeriods = document.querySelectorAll('input[type="checkbox"]:checked');

        const dates = datesText.split('\n').map(d => d.trim()).filter(d => d);

        if (!selectedUniversity || !className || dates.length === 0 || checkedPeriods.length === 0) {
            resultDiv.innerHTML = `<div class="alert alert-danger">大学、授業名、日付、時限をすべて入力してください。</div>`;
            return;
        }

        const periodTimes = universities[selectedUniversity].periods;

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

                const universityName = universities[selectedUniversity].name;
                const universityAddress = universities[selectedUniversity].address;
                const event = [
                    'BEGIN:VEVENT',
                    `UID:${date}-${period}@gemini-cli`,
                    `DTSTAMP:${dtStamp}`,
                    // 各予定にタイムゾーンIDを指定
                    `DTSTART;TZID=Asia/Tokyo:${startStr}`,
                    `DTEND;TZID=Asia/Tokyo:${endStr}`,
                    `SUMMARY:${universityName}：${className} (${period}限)`,
                    `LOCATION:${universityAddress}`,
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