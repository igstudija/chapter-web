'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import type { FaqSetting } from '@/payload-types'

type FAQItem = NonNullable<FaqSetting['faqs']>[number]

interface FAQClientProps {
  faqs: FAQItem[]
  labels: {
    all: string
    noFaqsInCategory: string
  }
}

export default function FAQClient({ faqs, labels }: FAQClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  // Get unique categories
  const categories = [
    'all',
    ...Array.from(new Set(faqs.map((faq) => faq.category).filter(Boolean) as string[])),
  ]

  // Filter and sort FAQs
  const filteredFaqs = faqs
    .filter((faq) => selectedCategory === 'all' || faq.category === selectedCategory)
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const getCategoryLabel = (category: string) => {
    if (category === 'all') return labels.all
    return category.charAt(0).toUpperCase() + category.slice(1)
  }

  return (
    <div>
      {/* Category Filter */}
      {categories.length > 2 && (
        <div className="mb-8 flex flex-wrap gap-2 justify-center">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-brand text-white'
                  : 'bg-neutral-100 dark:bg-surface-raised text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {getCategoryLabel(category)}
            </button>
          ))}
        </div>
      )}

      {/* FAQ Items */}
      <div className="space-y-4">
        {filteredFaqs.map((faq, index) => (
          <div
            key={faq.id || index}
            className="bg-white dark:bg-surface-raised rounded-lg shadow-md overflow-hidden transition-all"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full flex justify-between items-center p-6 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <span className="font-semibold text-ink dark:text-surface-text pr-4">
                {faq.question}
              </span>
              <ChevronDown
                className={`h-5 w-5 text-neutral-400 shrink-0 transition-transform ${
                  openIndex === index ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === index && typeof faq.answer === 'string' && (
              <div
                className="px-6 pb-6 prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: faq.answer }}
              />
            )}
          </div>
        ))}
      </div>

      {filteredFaqs.length === 0 && (
        <div className="bg-white dark:bg-surface-raised rounded-lg shadow-md p-8 text-center">
          <p className="text-neutral-500 dark:text-neutral-400">{labels.noFaqsInCategory}</p>
        </div>
      )}
    </div>
  )
}
