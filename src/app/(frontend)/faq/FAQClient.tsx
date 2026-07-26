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
        <div className="mb-10 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              aria-pressed={selectedCategory === category}
              className={`rounded-full border px-4 py-1.5 font-mono text-xs uppercase tracking-[0.1em] transition-colors ${
                selectedCategory === category
                  ? 'border-brand bg-brand text-white'
                  : 'border-line text-ink-soft hover:border-ink hover:text-ink dark:border-line-dark dark:text-neutral-400 dark:hover:border-neutral-400 dark:hover:text-surface-text'
              }`}
            >
              {getCategoryLabel(category)}
            </button>
          ))}
        </div>
      )}

      {/*
        FAQ list — a ruled stack rather than a column of floating cards. Each
        question hangs off the same hairline the rest of the site divides with,
        so a long list reads as one continuous document instead of a dozen
        shadowed boxes.
      */}
      <div className="border-t border-line dark:border-line-dark">
        {filteredFaqs.map((faq, index) => {
          const isOpen = openIndex === index
          return (
            <div key={faq.id || index} className="border-b border-line dark:border-line-dark">
              <button
                onClick={() => toggleFAQ(index)}
                aria-expanded={isOpen}
                className="group flex w-full items-start justify-between gap-6 py-5 text-left"
              >
                <span
                  className={`font-display text-base font-semibold leading-snug tracking-tight transition-colors md:text-lg ${
                    isOpen
                      ? 'text-brand'
                      : 'text-ink group-hover:text-brand dark:text-surface-text'
                  }`}
                >
                  {faq.question}
                </span>
                <ChevronDown
                  className={`mt-1 h-5 w-5 shrink-0 text-ink-soft transition-transform duration-200 dark:text-neutral-500 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && typeof faq.answer === 'string' && (
                <div
                  className="prose prose-sm max-w-[68ch] pb-7 dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: faq.answer }}
                />
              )}
            </div>
          )
        })}
      </div>

      {filteredFaqs.length === 0 && (
        <p className="border-t border-line py-12 text-sm text-ink-soft dark:border-line-dark dark:text-neutral-400">
          {labels.noFaqsInCategory}
        </p>
      )}
    </div>
  )
}
