import { useState } from "react";

export default function InstructionsPage({ onStart }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="instructions-page">
      <h1 className="instructions-title">ℹ️ Instructions</h1>

      <section>
        <h2 className="instructions-h2">General Instructions:</h2>
        <ol className="instructions-list">
          <li>
            The Question Palette displayed on the right side of screen will show the status of
            each question using one of the following symbols:
            <div className="legend">
              <div className="legend-row">
                <span className="dot dot-not_visited legend-dot">1</span>
                <span>You have not visited the question yet.</span>
              </div>
              <div className="legend-row">
                <span className="dot dot-not_answered legend-dot">3</span>
                <span>You have not answered the question.</span>
              </div>
              <div className="legend-row">
                <span className="dot dot-answered legend-dot">5</span>
                <span>You have answered the question.</span>
              </div>
              <div className="legend-row">
                <span className="dot dot-marked legend-dot">7</span>
                <span>You have NOT answered the question, but have marked the question for review.</span>
              </div>
              <div className="legend-row">
                <span className="dot dot-answered_marked legend-dot">9</span>
                <span>You have answered the question, but marked it for review.</span>
              </div>
            </div>
          </li>
          <li>
            The Marked for Review status for a question simply indicates that you would like to
            look at that question again.{" "}
            <em className="instructions-emph">
              If a question is answered and Marked for Review, your answer for that question will
              be considered in the evaluation.
            </em>
          </li>
        </ol>
      </section>

      <section>
        <h2 className="instructions-h2">Navigating to a Question:</h2>
        <ol className="instructions-list" start={3}>
          <li>
            To answer a question, do the following:
            <ol className="instructions-sublist" type="a">
              <li>Click on the question number in the Question Palette to go to that numbered question directly.</li>
              <li>Click on <strong>Save &amp; Next</strong> to save your answer for the current question and then go to the next question.</li>
              <li>Click on <strong>Mark for Review &amp; Next</strong> to save your answer for the current question, mark it for review, and then go to the next question.</li>
              <li>Caution: Note that your answer for the current question will not be saved, if you navigate to another question directly by clicking on its question number.</li>
            </ol>
          </li>
          <li>You can view all the questions by clicking on the <strong>Question Paper</strong> button. Note that the options for multiple choice type questions will not be shown.</li>
        </ol>
      </section>

      <section>
        <h2 className="instructions-h2">Answering a Question:</h2>
        <ol className="instructions-list" start={5}>
          <li>
            Procedure for answering a multiple choice type question:
            <ol className="instructions-sublist" type="a">
              <li>To select your answer, click on the button of one of the options.</li>
              <li>To deselect your chosen answer, click on the button of the chosen option again or click on the <strong>Clear Response</strong> button.</li>
              <li>To change your chosen answer, click on the button of another option.</li>
              <li>To save your answer, you MUST click on the <strong>Save &amp; Next</strong> button.</li>
              <li>To mark the question for review, click on the <strong>Mark for Review &amp; Next</strong> button.</li>
              <li>If an answer is selected for a question that is 'Marked for Review', that answer will be considered in the evaluation even if it is not marked as 'Save &amp; Next', at the time of final submission.</li>
            </ol>
          </li>
          <li>To change your answer to a question that has already been answered, first select that question for answering and then follow the procedure for answering that type of question.</li>
          <li>Note that only questions for which answers are saved or marked for review will be considered for evaluation.</li>
        </ol>
      </section>

      <section>
        <h2 className="instructions-h2">Other important notes:</h2>
        <ol className="instructions-list" start={8}>
          <li>Each section runs on its own timer; the section auto-submits with whatever is saved when time runs out.</li>
          <li>You can quit the test at any time using the <strong>Quit Test</strong> button — sections completed so far will still be scored.</li>
          <li>You can flag any question you believe is incorrect with the <strong>Report Error</strong> button.</li>
        </ol>
      </section>

      <label className="instructions-agree">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        I have read and understood the instructions. I agree that in case of not adhering to the
        instructions, I shall be liable to be debarred from this test.
      </label>

      <div className="instructions-start-bar">
        <button className="btn btn-primary btn-lg" disabled={!agreed} onClick={onStart}>
          Start
        </button>
      </div>
    </div>
  );
}
