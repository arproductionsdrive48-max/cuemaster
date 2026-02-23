import { useState } from 'react';
import { InventoryItem } from '@/types';
import { X, Check, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InventoryModalProps {
  item?: InventoryItem;
  onClose: () => void;
  onSave: (item: Omit<InventoryItem, 'id'>) => void;
}

const categoryEmojis: Record<string, string[]> = {
  drinks: ['🥤', '🍺', '☕', '💧', '🥫', '🧃'],
  snacks: ['🍟', '🥪', '🍕', '🥟', '🍿', '🧀'],
  meals: ['🍔', '🍛', '🍝', '🥘', '🍗', '🌯'],
};

const InventoryModal = ({ item, onClose, onSave }: InventoryModalProps) => {
  const [name, setName] = useState(item?.name || '');
  const [price, setPrice] = useState(item?.price?.toString() || '');
  const [stock, setStock] = useState(item?.stock?.toString() || '20');
  const [category, setCategory] = useState<'drinks' | 'snacks' | 'meals'>(item?.category || 'drinks');
  const [selectedIcon, setSelectedIcon] = useState(item?.icon || '🥤');

  const handleSave = () => {
    if (!name.trim() || !price.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    onSave({
      name: name.trim(),
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      category,
      icon: selectedIcon,
    });
    
    toast.success(item ? 'Item updated!' : 'Item added!');
  };

  return (
    <div className="modal-overlay animate-fade-in-up" onClick={onClose}>
      <div
        className="absolute inset-x-4 top-20 rounded-3xl glass-card overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">{item ? 'Edit Item' : 'Add Item'}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Item Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Coke, Sandwich..."
              className="input-glass w-full"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Category *</label>
            <div className="flex gap-2">
              {(['drinks', 'snacks', 'meals'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategory(cat);
                    setSelectedIcon(categoryEmojis[cat][0]);
                  }}
                  className={cn(
                    'flex-1 py-3 rounded-xl text-sm font-medium transition-all capitalize',
                    category === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {categoryEmojis[category].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setSelectedIcon(emoji)}
                  className={cn(
                    'w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all',
                    selectedIcon === emoji
                      ? 'bg-primary/20 border-2 border-primary'
                      : 'bg-secondary hover:bg-accent'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Price & Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Price (₹) *</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="50"
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Stock</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="20"
                className="input-glass w-full"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full btn-premium flex items-center justify-center gap-2 py-4"
          >
            <Check className="w-5 h-5" />
            {item ? 'Update Item' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryModal;
