'use client'

import { JSX, useState } from 'react'
import CancelButton from './CancelButton'

export default function TermsAcceptance(): JSX.Element {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div className="flex justify-center">
        <span className="text-xs text-stone-600 dark:text-stone-400">
          By selecting a file, you agree to{' '}
          <button
            onClick={() => setShowModal(true)}
            className="underline hover:text-stone-900 dark:hover:text-stone-200 transition-colors duration-200"
            aria-label="View upload terms"
          >
            our terms
          </button>
          .
        </span>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-8 max-w-md w-full shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="modal-title"
              className="text-xl font-bold mb-4 text-stone-900 dark:text-stone-50"
            >
              FilePizza Terms
            </h2>

            <div className="space-y-4 text-stone-700 dark:text-stone-300">
              <ul className="list-none space-y-3">
                <li className="flex items-start gap-3 px-4 py-2 rounded-lg bg-stone-100 dark:bg-stone-800">
                  <span className="text-base">📤</span>
                  <span className="text-sm">
                    Files are shared directly between browsers — no server
                    storage
                  </span>
                </li>
                <li className="flex items-start gap-3 px-4 py-2 rounded-lg bg-stone-100 dark:bg-stone-800">
                  <span className="text-base">✅</span>
                  <span className="text-sm">
                    Only upload files you have the right to share
                  </span>
                </li>
                <li className="flex items-start gap-3 px-4 py-2 rounded-lg bg-stone-100 dark:bg-stone-800">
                  <span className="text-base">🔒</span>
                  <span className="text-sm">
                    Share download links only with known recipients
                  </span>
                </li>
                <li className="flex items-start gap-3 px-4 py-2 rounded-lg bg-stone-100 dark:bg-stone-800">
                  <span className="text-base">⚠️</span>
                  <span className="text-sm">
                    No illegal or harmful content allowed
                  </span>
                </li>
              </ul>

              <p className="text-sm italic">
                By uploading a file, you confirm that you understand and agree
                to these terms.
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <CancelButton
                text="Got it!"
                onClick={() => setShowModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
