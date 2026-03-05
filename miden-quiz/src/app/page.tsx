"use client";

import { useState, useEffect } from "react";
import { questionPool, Question } from "@/data/questions";

// Screen types
type Screen = "welcome" | "username" | "quiz" | "results";

// Miden Logo Component - Official Sigma Symbol SVG
const MidenLogo = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 100 120"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Main Sigma body */}
    <path
      d="M75 10 L75 22 L45 22 L65 55 L65 65 L45 98 L75 98 L75 110 L25 110 L25 95 L48 60 L25 25 L25 10 Z"
      fill="#FF6B35"
    />
    {/* Horizontal crossbar */}
    <rect x="55" y="52" width="30" height="14" fill="#FF6B35" />
    {/* Top right decorative slash */}
    <path
      d="M75 5 L85 5 L85 22 L75 10 Z"
      fill="#FF6B35"
    />
    {/* Bottom left curl */}
    <path
      d="M25 110 C15 110 10 105 10 95 L10 88 L25 95 Z"
      fill="#FF6B35"
    />
    {/* Bottom right curl */}
    <path
      d="M75 110 C85 110 90 105 90 95 L90 88 L75 95 Z"
      fill="#FF6B35"
    />
  </svg>
);

// Animated background particles
const ParticleBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className="absolute w-2 h-2 bg-miden-orange/20 rounded-full animate-float"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 3}s`,
          animationDuration: `${3 + Math.random() * 2}s`,
        }}
      />
    ))}
  </div>
);

// Welcome Screen
const WelcomeScreen = ({ onStart }: { onStart: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-screen px-4 animate-fade-in">
    <div className="text-center max-w-lg">
      <div className="mb-8 animate-float">
        <MidenLogo className="w-40 h-40 mx-auto" />
      </div>
      <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
        <span className="text-gradient">MIDEN</span>
      </h1>
      <h2 className="text-2xl md:text-3xl font-semibold text-white/80 mb-6">
        Knowledge Quiz
      </h2>
      <p className="text-white/60 text-lg mb-10 leading-relaxed">
        Test your knowledge of Miden - the zero-knowledge rollup for 
        high-throughput, private applications secured by Ethereum.
      </p>
      <button
        onClick={onStart}
        className="btn-primary text-xl px-12 py-5 animate-glow"
      >
        Enter Quiz
      </button>
      <p className="text-white/40 text-sm mt-8">
        20 questions • Multiple choice • Learn about ZK technology
      </p>
    </div>
  </div>
);

// Username Screen
const UsernameScreen = ({
  username,
  setUsername,
  onStart,
}: {
  username: string;
  setUsername: (name: string) => void;
  onStart: () => void;
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onStart();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 animate-fade-in">
      <div className="card p-8 md:p-12 max-w-md w-full">
        <div className="text-center mb-8">
          <MidenLogo className="w-20 h-20 mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Welcome, Challenger!
          </h2>
          <p className="text-white/60">
            Enter your X (Twitter) username to begin
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="relative mb-6">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-lg">
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_username"
              className="input-field pl-10"
              maxLength={15}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!username.trim()}
            className={`btn-primary w-full ${
              !username.trim() ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Start Quiz
          </button>
        </form>
        <div className="mt-6 flex items-center gap-4 text-white/40 text-sm justify-center">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            20 Questions
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
            </svg>
            ~5 minutes
          </span>
        </div>
      </div>
    </div>
  );
};

// Quiz Screen
const QuizScreen = ({
  questions,
  currentQuestion,
  selectedAnswer,
  showResult,
  score,
  onSelectAnswer,
  onNextQuestion,
}: {
  questions: Question[];
  currentQuestion: number;
  selectedAnswer: number | null;
  showResult: boolean;
  score: number;
  onSelectAnswer: (index: number) => void;
  onNextQuestion: () => void;
}) => {
  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen px-4 py-8 animate-fade-in">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MidenLogo className="w-10 h-10" />
            <span className="text-white/60 font-medium">Miden Quiz</span>
          </div>
          <div className="text-white/60 font-medium">
            Score: <span className="text-miden-orange">{score}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-white/60 mb-2">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="card p-6 md:p-8 mb-6 animate-slide-up">
          <div className="flex items-start gap-4 mb-6">
            <span className="flex-shrink-0 w-10 h-10 bg-miden-orange/20 rounded-full flex items-center justify-center text-miden-orange font-bold">
              {currentQuestion + 1}
            </span>
            <h3 className="text-xl md:text-2xl font-semibold text-white leading-relaxed">
              {question.question}
            </h3>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option, index) => {
              let optionClass = "option-btn text-white/80";
              
              if (showResult) {
                if (index === question.correctAnswer) {
                  optionClass = "option-btn correct";
                } else if (index === selectedAnswer && index !== question.correctAnswer) {
                  optionClass = "option-btn incorrect";
                }
              } else if (selectedAnswer === index) {
                optionClass = "option-btn selected text-white";
              }

              return (
                <button
                  key={index}
                  onClick={() => !showResult && onSelectAnswer(index)}
                  disabled={showResult}
                  className={optionClass}
                >
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      showResult && index === question.correctAnswer
                        ? "bg-green-500 text-white"
                        : showResult && index === selectedAnswer && index !== question.correctAnswer
                        ? "bg-red-500 text-white"
                        : selectedAnswer === index
                        ? "bg-miden-orange text-white"
                        : "bg-white/10 text-white/60"
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1">{option}</span>
                    {showResult && index === question.correctAnswer && (
                      <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    )}
                    {showResult && index === selectedAnswer && index !== question.correctAnswer && (
                      <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showResult && (
            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10 animate-scale-in">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-miden-orange flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
                <p className="text-white/70 text-sm leading-relaxed">
                  {question.explanation}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Next Button */}
        {showResult && (
          <div className="flex justify-center animate-scale-in">
            <button onClick={onNextQuestion} className="btn-primary px-10">
              {currentQuestion < questions.length - 1 ? "Next Question" : "See Results"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Results Screen
const ResultsScreen = ({
  score,
  totalQuestions,
  username,
  onRestart,
}: {
  score: number;
  totalQuestions: number;
  username: string;
  onRestart: () => void;
}) => {
  const percentage = Math.round((score / totalQuestions) * 100);
  
  const getMessage = () => {
    if (percentage >= 90) return { title: "Miden Master!", emoji: "🏆", text: "You're a true Miden expert! The ZK community would be proud." };
    if (percentage >= 70) return { title: "Great Job!", emoji: "🌟", text: "You have solid knowledge of Miden technology!" };
    if (percentage >= 50) return { title: "Good Effort!", emoji: "💪", text: "You're on your way to becoming a Miden expert!" };
    return { title: "Keep Learning!", emoji: "📚", text: "Explore more about Miden at miden.xyz!" };
  };

  const message = getMessage();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 animate-fade-in">
      <div className="card p-8 md:p-12 max-w-lg w-full text-center">
        <div className="mb-6">
          <MidenLogo className="w-24 h-24 mx-auto mb-4" />
          <span className="text-6xl">{message.emoji}</span>
        </div>
        
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
          {message.title}
        </h2>
        
        <p className="text-white/60 mb-8">{message.text}</p>
        
        {/* Score circle */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${percentage * 5.53} 553`}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FF6B35" />
                <stop offset="100%" stopColor="#FF8C5A" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-gradient">{score}</span>
            <span className="text-white/60 text-lg">of {totalQuestions}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-white/5 rounded-xl">
            <span className="text-2xl font-bold text-miden-orange">{percentage}%</span>
            <p className="text-white/60 text-sm">Score</p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl">
            <span className="text-2xl font-bold text-green-400">{score}</span>
            <p className="text-white/60 text-sm">Correct</p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl">
            <span className="text-2xl font-bold text-red-400">{totalQuestions - score}</span>
            <p className="text-white/60 text-sm">Wrong</p>
          </div>
        </div>

        {/* Share Card Preview */}
        <div className="relative mb-8 p-1 rounded-2xl bg-gradient-to-r from-miden-orange to-miden-orange-light">
          <div className="bg-miden-dark rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <MidenLogo className="w-10 h-10" />
              <div className="text-left">
                <p className="text-white font-bold">Miden Quiz</p>
                <p className="text-white/60 text-sm">Test your ZK knowledge</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-white/60 text-sm">@{username} scored</p>
                <p className="text-3xl font-bold text-gradient">{score}/{totalQuestions}</p>
              </div>
              <div className="text-right">
                <span className="text-5xl">{message.emoji}</span>
                <p className="text-miden-orange font-semibold text-sm">{percentage}%</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-white/60 text-sm">Think you can beat this? Try the quiz!</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Share to X Button */}
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
              `🎯 I just scored ${score}/${totalQuestions} (${percentage}%) on the Miden Quiz!\n\n${
                percentage >= 90 ? "🏆 Miden Master status achieved!" :
                percentage >= 70 ? "🌟 Solid ZK knowledge!" :
                percentage >= 50 ? "💪 Learning the ZK ways!" :
                "📚 Time to dive deeper into ZK!"
              }\n\nThink you know Miden better? Test your knowledge on ZK rollups, STARK proofs, and more!\n\n@0xPolygonMiden #Miden #ZeroKnowledge #ZKRollup`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full inline-flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share Results on X
          </a>

          <button onClick={onRestart} className="btn-secondary w-full">
            Take Quiz Again
          </button>
          
          <a
            href="https://miden.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-white/60 hover:text-miden-orange transition-colors py-2"
          >
            Learn More at miden.xyz →
          </a>
        </div>

        {/* Challenge friends */}
        <p className="text-white/40 text-sm mt-6">
          Challenge your friends to beat your score! 🚀
        </p>
      </div>
    </div>
  );
};

// Main App Component
export default function MidenQuiz() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [username, setUsername] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);

  // Select 20 random questions from pool and shuffle their options
  const shuffleQuestionsAndOptions = () => {
    // Fisher-Yates shuffle to get truly random selection
    const poolCopy = [...questionPool];
    for (let i = poolCopy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [poolCopy[i], poolCopy[j]] = [poolCopy[j], poolCopy[i]];
    }
    // Take first 20 questions from shuffled pool
    const selected = poolCopy.slice(0, 20);
    
    // Now shuffle the options within each question
    const shuffled = selected.map((q) => {
      // Create array of option indices and shuffle them
      const indices = [0, 1, 2, 3];
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      
      // Reorder options based on shuffled indices
      const shuffledOptions = indices.map(i => q.options[i]);
      // Find new index of correct answer
      const newCorrectAnswer = indices.indexOf(q.correctAnswer);
      
      return {
        ...q,
        options: shuffledOptions,
        correctAnswer: newCorrectAnswer,
      };
    });
    return shuffled;
  };

  useEffect(() => {
    setShuffledQuestions(shuffleQuestionsAndOptions());
  }, []);

  const handleSelectAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);
    if (index === shuffledQuestions[currentQuestion].correctAnswer) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < shuffledQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setScreen("results");
    }
  };

  const handleRestart = () => {
    setShuffledQuestions(shuffleQuestionsAndOptions());
    setScreen("welcome");
    setUsername("");
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
  };

  return (
    <div className="relative">
      <ParticleBackground />
      
      {screen === "welcome" && (
        <WelcomeScreen onStart={() => setScreen("username")} />
      )}
      
      {screen === "username" && (
        <UsernameScreen
          username={username}
          setUsername={setUsername}
          onStart={() => setScreen("quiz")}
        />
      )}
      
      {screen === "quiz" && shuffledQuestions.length > 0 && (
        <QuizScreen
          questions={shuffledQuestions}
          currentQuestion={currentQuestion}
          selectedAnswer={selectedAnswer}
          showResult={showResult}
          score={score}
          onSelectAnswer={handleSelectAnswer}
          onNextQuestion={handleNextQuestion}
        />
      )}
      
      {screen === "results" && (
        <ResultsScreen
          score={score}
          totalQuestions={shuffledQuestions.length}
          username={username}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
