import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

const CHARTS_DIR = path.join(__dirname, '../../../../reports/charts');

// Ensure charts directory exists
if (!fs.existsSync(CHARTS_DIR)) {
  fs.mkdirSync(CHARTS_DIR, { recursive: true });
}

interface ChartData {
  labels: string[];
  values: number[];
  colors?: string[];
}

/**
 * Generate a bar chart as PNG image
 */
export async function generateBarChart(
  data: ChartData,
  title: string,
  fileName: string
): Promise<string> {
  const width = 600;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, 30);

  // Chart area
  const chartX = 80;
  const chartY = 60;
  const chartWidth = width - 120;
  const chartHeight = height - 120;

  // Find max value for scaling
  const maxValue = Math.max(...data.values);
  const scale = chartHeight / (maxValue * 1.1); // 1.1 for padding

  // Default colors
  const defaultColors = ['#90CAF9', '#66BB6A', '#FFA726', '#F44336', '#AB47BC'];
  const colors = data.colors || defaultColors;

  // Draw bars
  const barWidth = chartWidth / data.values.length;
  const barSpacing = barWidth * 0.2;
  const actualBarWidth = barWidth - barSpacing;

  data.values.forEach((value, index) => {
    const barHeight = value * scale;
    const x = chartX + index * barWidth + barSpacing / 2;
    const y = chartY + chartHeight - barHeight;

    // Bar
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(x, y, actualBarWidth, barHeight);

    // Value label on top of bar
    ctx.fillStyle = '#000000';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      value.toString(),
      x + actualBarWidth / 2,
      y - 5
    );

    // X-axis label
    ctx.save();
    ctx.translate(x + actualBarWidth / 2, chartY + chartHeight + 15);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#333333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(data.labels[index], 0, 0);
    ctx.restore();
  });

  // Y-axis
  ctx.strokeStyle = '#CCCCCC';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chartX, chartY);
  ctx.lineTo(chartX, chartY + chartHeight);
  ctx.lineTo(chartX + chartWidth, chartY + chartHeight);
  ctx.stroke();

  // Save to file
  const filePath = path.join(CHARTS_DIR, fileName);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

/**
 * Generate a pie chart as PNG image
 */
export async function generatePieChart(
  data: ChartData,
  title: string,
  fileName: string
): Promise<string> {
  const width = 500;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, 30);

  // Calculate center and radius
  const centerX = width / 2;
  const centerY = height / 2 + 20;
  const radius = Math.min(width, height) / 3;

  // Default colors
  const defaultColors = ['#66BB6A', '#FFA726', '#F44336', '#42A5F5', '#AB47BC'];
  const colors = data.colors || defaultColors;

  // Calculate total and percentages
  const total = data.values.reduce((sum, val) => sum + val, 0);
  let currentAngle = -Math.PI / 2; // Start at top

  data.values.forEach((value, index) => {
    const sliceAngle = (value / total) * 2 * Math.PI;

    // Draw slice
    ctx.fillStyle = colors[index % colors.length];
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();

    // Draw label
    const labelAngle = currentAngle + sliceAngle / 2;
    const labelX = centerX + Math.cos(labelAngle) * (radius + 40);
    const labelY = centerY + Math.sin(labelAngle) * (radius + 40);
    const percentage = ((value / total) * 100).toFixed(1);

    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = labelX > centerX ? 'left' : 'right';
    ctx.fillText(`${data.labels[index]}: ${percentage}%`, labelX, labelY);

    currentAngle += sliceAngle;
  });

  // Save to file
  const filePath = path.join(CHARTS_DIR, fileName);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

/**
 * Generate a risk matrix heatmap
 */
export async function generateRiskMatrix(
  criticalCount: number,
  highCount: number,
  mediumCount: number,
  lowCount: number,
  fileName: string
): Promise<string> {
  const width = 400;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Risk Distribution', width / 2, 25);

  // Risk levels
  const risks = [
    { label: 'Critical', count: criticalCount, color: '#D32F2F' },
    { label: 'High', count: highCount, color: '#F57C00' },
    { label: 'Medium', count: mediumCount, color: '#FBC02D' },
    { label: 'Low', count: lowCount, color: '#388E3C' },
  ];

  const startY = 60;
  const barHeight = 50;
  const maxWidth = 300;
  const maxCount = Math.max(criticalCount, highCount, mediumCount, lowCount) || 1;

  risks.forEach((risk, index) => {
    const y = startY + index * (barHeight + 10);
    const barWidth = (risk.count / maxCount) * maxWidth;

    // Bar
    ctx.fillStyle = risk.color;
    ctx.fillRect(50, y, barWidth, barHeight);

    // Label
    ctx.fillStyle = '#000000';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(risk.label, 55, y + barHeight / 2 + 5);

    // Count
    ctx.textAlign = 'right';
    ctx.fillText(risk.count.toString(), 45, y + barHeight / 2 + 5);
  });

  // Save to file
  const filePath = path.join(CHARTS_DIR, fileName);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filePath, buffer);

  return filePath;
}
