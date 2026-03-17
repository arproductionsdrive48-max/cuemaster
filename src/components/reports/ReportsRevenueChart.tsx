import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function ReportsRevenueChart({ data }: { data: any[] }) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevReports" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
        <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} dy={10} />
        <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val: number) => `₹${val}`} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1a1c23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
          itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
          formatter={(val: number) => [`₹${val}`, 'Revenue']}
        />
        <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevReports)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
