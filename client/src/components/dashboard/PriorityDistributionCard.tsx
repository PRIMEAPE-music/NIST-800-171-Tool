import React from 'react';
import {
  Card,
  CardContent,
  Typography
} from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PriorityDistributionCardProps {
  stats?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

const COLORS = {
  Critical: '#F44336',
  High: '#FF9800',
  Medium: '#2196F3',
  Low: '#757575'
};

const PriorityDistributionCard: React.FC<PriorityDistributionCardProps> = ({ stats }) => {
  if (!stats) return null;

  const data = [
    { name: 'Critical', value: stats.critical },
    { name: 'High', value: stats.high },
    { name: 'Medium', value: stats.medium },
    { name: 'Low', value: stats.low }
  ].filter(item => item.value > 0);

  return (
    <Card sx={{ backgroundColor: '#242424', height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
          Priority Distribution
        </Typography>

        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#2C2C2C',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 4,
                color: '#E0E0E0'
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{ color: '#B0B0B0' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default PriorityDistributionCard;
