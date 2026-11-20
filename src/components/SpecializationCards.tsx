import React from 'react';
import {
  Scissors,
  Sparkles,
  Palette,
  Eye,
  HeartHandshake,
  Check,
} from 'lucide-react';
import { SpecializationId } from '../types/crm';
import { SPECIALIZATIONS } from '../data/specializations';

interface SpecializationCardsProps {
  selectedId: SpecializationId;
  onSelect: (id: SpecializationId) => void;
  columns?: 1 | 2;
}

const SPEC_ICONS: Record<SpecializationId, React.ReactNode> = {
  nails: <Sparkles className="w-5 h-5" />,
  barber: <Scissors className="w-5 h-5" />,
  hair: <Palette className="w-5 h-5" />,
  lashes: <Eye className="w-5 h-5" />,
  cosmetology: <HeartHandshake className="w-5 h-5" />,
};

export const SpecializationCards: React.FC<SpecializationCardsProps> = ({
  selectedId,
  onSelect,
  columns = 1,
}) => {
  return (
    <div
      className={`grid gap-3 ${
        columns === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
      }`}
    >
      {SPECIALIZATIONS.map((spec) => {
        const isSelected = spec.id === selectedId;
        return (
          <button
            key={spec.id}
            type="button"
            onClick={() => onSelect(spec.id)}
            className={`w-full text-left p-4 rounded-2xl border transition-all min-h-[68px] flex items-start gap-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10B981] active:scale-[0.99] ${
              isSelected
                ? 'bg-[#0B0C0E] border-[#10B981] text-[#F3F4F6]'
                : 'bg-[#252932] border-[#323846] text-[#F3F4F6] hover:border-[#4B5563]'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                isSelected
                  ? 'bg-[#10B981]/15 text-[#10B981]'
                  : 'bg-[#1C1F26] text-[#9CA3AF]'
              }`}
            >
              {SPEC_ICONS[spec.id]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold tracking-tight text-[#F3F4F6]">
                  {spec.title}
                </span>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-[#10B981] text-[#06281E] flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" strokeWidth={2.75} />
                  </span>
                )}
              </div>
              <p className="text-xs mt-1 text-[#9CA3AF] leading-relaxed">
                {spec.services.map((s) => `${s.name} (${s.cycleDays} дн.)`).join(' · ')}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
