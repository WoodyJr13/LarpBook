# AP Bluebook Practice Simulator (Prototype)

This is a lightweight browser prototype that simulates core **Bluebook-style test-taking interactions** for AP practice PDFs.

## Features implemented

- Upload a practice PDF locally (client-side only).
- Parse multiple-choice style questions using basic regex heuristics.
- Show **stimulus (PDF page)** and **question panel** side-by-side.
- Cross out an entire question.
- Cross out individual answer choices.
- Mark/unmark questions for review.
- Zoom in/out on the stimulus panel.
- Jump to any question with the question picker.
- Fallback mode: if parsing fails, each PDF page is still navigable.

## Quick start

1. In this folder, run:

   ```bash
   python3 -m http.server 8000
   ```

2. Open <http://localhost:8000>.
3. Upload a practice AP PDF.

## Notes and limitations

- This is a prototype, not an official Bluebook clone.
- Parsing relies on text extraction and simple patterns like `1.`, `2)` and `A.`, `B)`.
- PDFs with unusual layout, scanned images, or highly stylized fonts may not parse cleanly.
- No persistence yet (answers/review status reset on refresh).

## Suggested next steps

- Add OCR fallback for scanned PDFs.
- Add timer and section controls to mimic AP session flow.
- Add keyboard navigation and accessibility enhancements.
- Save test session state in localStorage.
- Improve parser with AP-subject-specific templates.
