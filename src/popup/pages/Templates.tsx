import { useState } from 'react';
import { Search, Star, Plus, Palette } from 'lucide-react';
import { PROMPT_TEMPLATES } from '@/config/constants';
import type { PromptTemplate, VideoTemplate } from '@/types';

export default function Templates() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate | null>(null);

  const templates = Object.values(PROMPT_TEMPLATES);

  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.nameLocal.includes(searchQuery) ||
      template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const customTemplates = [
    { id: 'custom-1', name: 'My Gaming Product Template', rating: 4.5, usageCount: 45 },
    { id: 'custom-2', name: 'Fashion Item Showcase', rating: 4.8, usageCount: 32 },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-gray-900">Video Templates</h2>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search templates..."
          className="input pl-10"
        />
      </div>

      {/* Popular Templates */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Popular Templates</h3>
        <div className="grid grid-cols-2 gap-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={selectedTemplate === template.id}
              onSelect={() => setSelectedTemplate(template.id as VideoTemplate)}
            />
          ))}
        </div>
      </div>

      {/* Custom Templates */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          Custom Templates ({customTemplates.length})
        </h3>
        <div className="space-y-2">
          {customTemplates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 cursor-pointer transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{template.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1 text-xs text-yellow-500">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{template.rating}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    Used {template.usageCount} times
                  </span>
                </div>
              </div>
              <button className="btn btn-secondary text-xs">Use</button>
            </div>
          ))}
        </div>

        {/* Create Custom Template */}
        <button className="w-full mt-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors">
          <Plus className="w-5 h-5 text-gray-400 mx-auto" />
          <p className="text-sm text-gray-600 mt-1">Create Custom Template</p>
        </button>
      </div>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <TemplatePreview
          template={PROMPT_TEMPLATES[selectedTemplate]}
          onClose={() => setSelectedTemplate(null)}
          onUse={() => {
            // TODO: Navigate to create with this template
            setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: typeof PROMPT_TEMPLATES[keyof typeof PROMPT_TEMPLATES];
  isSelected: boolean;
  onSelect: () => void;
}

function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  const thumbnailEmojis: Record<string, string> = {
    'product-review': '📦',
    'unboxing': '🎁',
    'deal-alert': '🔥',
    'before-after': '✨',
  };

  return (
    <button
      onClick={onSelect}
      className={`p-3 rounded-lg border-2 text-left transition-all ${
        isSelected
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-md flex items-center justify-center mb-2">
        <span className="text-3xl">{thumbnailEmojis[template.id] || '🎬'}</span>
      </div>

      {/* Info */}
      <p className="text-sm font-medium text-gray-900">{template.nameLocal}</p>
      <p className="text-xs text-gray-500">{template.name}</p>

      {/* Rating */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1 text-xs text-yellow-500">
          <Star className="w-3 h-3 fill-current" />
          <span>{template.rating}</span>
        </div>
        <span className="text-xs text-gray-400">{template.usageCount.toLocaleString()}</span>
      </div>
    </button>
  );
}

interface TemplatePreviewProps {
  template: typeof PROMPT_TEMPLATES[keyof typeof PROMPT_TEMPLATES];
  onClose: () => void;
  onUse: () => void;
}

function TemplatePreview({ template, onClose, onUse }: TemplatePreviewProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-sm max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{template.nameLocal}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-500">{template.name}</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Description */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
            <p className="text-sm text-gray-600">{template.description}</p>
          </div>

          {/* Template */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Prompt Template</p>
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-600 font-mono whitespace-pre-wrap">
                {template.template}
              </p>
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Tags</p>
            <div className="flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-1 text-yellow-500">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium">{template.rating}</span>
            </div>
            <span className="text-sm text-gray-500">
              {template.usageCount.toLocaleString()} uses
            </span>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-2">
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={onUse} className="btn btn-primary flex-1">
            Use Template
          </button>
        </div>
      </div>
    </div>
  );
}
