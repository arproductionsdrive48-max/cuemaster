import Header from '@/components/layout/Header';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, IndianRupee, CreditCard, Utensils, Clock } from 'lucide-react';

const dailyRevenue = [
  { day: 'Mon', amount: 4500 },
  { day: 'Tue', amount: 3800 },
  { day: 'Wed', amount: 5200 },
  { day: 'Thu', amount: 4100 },
  { day: 'Fri', amount: 7800 },
  { day: 'Sat', amount: 9200 },
  { day: 'Sun', amount: 8500 },
];

const salesBreakdown = [
  { name: 'Table', value: 65, color: 'hsl(0, 84%, 60%)' },
  { name: 'Food', value: 25, color: 'hsl(142, 76%, 45%)' },
  { name: 'Drinks', value: 10, color: 'hsl(45, 93%, 58%)' },
];

const ReportsScreen = () => {
  const totalRevenue = dailyRevenue.reduce((sum, d) => sum + d.amount, 0);
  const avgDaily = Math.round(totalRevenue / 7);
  const pendingCredits = 4800;

  return (
    <div className="min-h-screen pb-24">
      <Header title="Reports" />

      {/* Summary Cards */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-available/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-available" />
              </div>
              <span className="text-sm text-muted-foreground">This Week</span>
            </div>
            <div className="flex items-center gap-1">
              <IndianRupee className="w-5 h-5" />
              <span className="text-2xl font-bold">{totalRevenue.toLocaleString()}</span>
            </div>
            <p className="text-xs text-available mt-1">+12% from last week</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Avg Daily</span>
            </div>
            <div className="flex items-center gap-1">
              <IndianRupee className="w-5 h-5" />
              <span className="text-2xl font-bold">{avgDaily.toLocaleString()}</span>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <div className="flex items-center gap-1 text-primary">
              <IndianRupee className="w-5 h-5" />
              <span className="text-2xl font-bold">{pendingCredits.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">4 members</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-gold/20 flex items-center justify-center">
                <Utensils className="w-4 h-4 text-gold" />
              </div>
              <span className="text-sm text-muted-foreground">F&B Sales</span>
            </div>
            <div className="flex items-center gap-1">
              <IndianRupee className="w-5 h-5" />
              <span className="text-2xl font-bold">15,200</span>
            </div>
            <p className="text-xs text-available mt-1">+8% from last week</p>
          </div>
        </div>
      </div>

      {/* Daily Revenue Chart */}
      <div className="px-4 mb-6">
        <div className="glass-card p-4">
          <h3 className="font-semibold mb-4">Daily Revenue</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyRevenue}>
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(0 0% 55%)', fontSize: 12 }}
                />
                <YAxis 
                  hide 
                />
                <Bar 
                  dataKey="amount" 
                  fill="hsl(0 84% 60%)" 
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sales Breakdown */}
      <div className="px-4 mb-6">
        <div className="glass-card p-4">
          <h3 className="font-semibold mb-4">Sales Breakdown</h3>
          <div className="flex items-center gap-6">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {salesBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {salesBreakdown.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4">
        <div className="glass-card p-4">
          <h3 className="font-semibold mb-4">This Week's Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Sessions</span>
              <span className="font-bold">148</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Avg Session Time</span>
              <span className="font-bold">1h 45m</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Peak Hours</span>
              <span className="font-bold">6PM - 10PM</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Most Popular Table</span>
              <span className="font-bold">Table 3</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsScreen;
