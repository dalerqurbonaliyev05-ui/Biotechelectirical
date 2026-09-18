// Vaqt o'qlari (1 dan 24 gacha)
const labels = Array.from({length: 24}, (_, i) => i + 1);

// Excel jadvalidan olingan boshlang'ich ma'lumotlar
let dataQishAktiv = [1.39, 1.39, 1.39, 1.39, 1.12, 1.12, 1.12, 1.43, 1.43, 1.43, 1.43, 1.43, 1.20, 1.20, 1.20, 1.12, 1.12, 1.12, 1.12, 1.20, 1.43, 1.39, 1.39, 1.39];
let dataQishReaktiv = [3.94, 3.94, 3.94, 3.94, 3.10, 3.10, 3.10, 4.16, 4.16, 4.16, 4.16, 4.16, 3.54, 3.54, 3.54, 3.10, 3.10, 3.10, 3.10, 3.54, 4.16, 3.94, 3.94, 3.94];

let dataYozAktiv = [0.86, 0.86, 1.12, 1.12, 0.86, 1.20, 1.20, 1.20, 1.39, 1.43, 1.43, 0.86, 0.86, 1.12, 0.86, 1.12, 1.12, 1.12, 0.86, 0.86, 1.12, 1.39, 1.20, 1.20];
let dataYozReaktiv = [2.73, 2.73, 3.10, 3.10, 2.73, 3.54, 3.54, 3.54, 3.94, 4.16, 4.16, 2.73, 2.73, 3.10, 2.73, 2.39, 2.39, 2.39, 2.73, 2.73, 3.10, 3.94, 3.54, 3.54];

// Umumiy grafik sozlamalari (pog'onali chiziq uchun)
const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false }
    },
    scales: {
        x: {
            title: { display: true, text: 't, soat' },
            grid: { color: '#e0e0e0' }
        },
        y: {
            beginAtZero: true,
            grid: { color: '#e0e0e0' }
        }
    }
};

// Grafik yaratish funksiyasi
function createChart(ctxId, data, borderColor, yTitle) {
    const ctx = document.getElementById(ctxId).getContext('2d');
    
    // Y o'qi sarlavhasini qo'shish
    let options = JSON.parse(JSON.stringify(commonOptions)); 
    options.scales.y.title = { display: true, text: yTitle };

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                borderColor: borderColor,
                borderWidth: 2,
                stepped: true, // Ushbu parametr grafikni pog'onali qiladi
                fill: false,
                pointBackgroundColor: borderColor,
                pointRadius: 3
            }]
        },
        options: options
    });
}

// 4 ta grafikni chizish
const qishAktivChart = createChart('qishAktivChart', dataQishAktiv, '#000000', 'P, kVt');
const qishReaktivChart = createChart('qishReaktivChart', dataQishReaktiv, '#154360', 'Q, kvar');
const yozAktivChart = createChart('yozAktivChart', dataYozAktiv, '#000000', 'P, kVt');
const yozReaktivChart = createChart('yozReaktivChart', dataYozReaktiv, '#154360', 'Q, kvar');

// Kelajakda qiymatlarni dinamik o'zgartirish uchun funksiya namunasi
function updateChartsWithNewData(newQishAktiv, newQishReaktiv, newYozAktiv, newYozReaktiv) {
    qishAktivChart.data.datasets[0].data = newQishAktiv;
    qishAktivChart.update();

    qishReaktivChart.data.datasets[0].data = newQishReaktiv;
    qishReaktivChart.update();

    yozAktivChart.data.datasets[0].data = newYozAktiv;
    yozAktivChart.update();

    yozReaktivChart.data.datasets[0].data = newYozReaktiv;
    yozReaktivChart.update();
}