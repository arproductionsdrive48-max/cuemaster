import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

interface MatchesLineChartProps {
  data: { name: string; matches: number }[];
}

const MatchesLineChart = ({ data }: MatchesLineChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="#222" strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey="name" 
          stroke="#666" 
          axisLine={false} 
          tickLine={false} 
          dy={10} 
          tick={{ fontSize: 12, fill: '#888' }} 
        />
        <YAxis 
          hide 
          domain={['dataMin - 20', 'dataMax + 20']} 
        />
        <Tooltip
          cursor={{ stroke: '#333', strokeWidth: 1, strokeDasharray: '4 4' }}
          contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '8px', fontSize: '13px' }}
          itemStyle={{ color: '#fff' }}
        />
        <Line 
          type="monotone" 
          dataKey="matches" 
          stroke="#2979FF" 
          strokeWidth={3}
          dot={{ r: 4, fill: '#2979FF', strokeWidth: 2, stroke: '#121212' }}
          activeDot={{ r: 6, stroke: '#2979FF', strokeWidth: 2, fill: '#fff' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default MatchesLineChart;
