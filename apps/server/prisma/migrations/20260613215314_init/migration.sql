-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "matchesWon" INTEGER NOT NULL DEFAULT 0,
    "rating" INTEGER NOT NULL DEFAULT 1000,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "rank" TEXT NOT NULL DEFAULT 'UNRANKED',
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "highestStreak" INTEGER NOT NULL DEFAULT 0,
    "highestRating" INTEGER NOT NULL DEFAULT 1000,
    "dailyChallengeWins" INTEGER NOT NULL DEFAULT 0,
    "dailyChallengeBestRank" INTEGER NOT NULL DEFAULT 0,
    "dailyWins" INTEGER NOT NULL DEFAULT 0,
    "lastDailyWinAt" TIMESTAMP(3),
    "streakGraceAvailable" INTEGER NOT NULL DEFAULT 0,
    "lastStreakResetAt" TIMESTAMP(3),
    "lastDailyResetAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "timeLimit" INTEGER NOT NULL,
    "memoryLimit" INTEGER NOT NULL,
    "compatibleModes" TEXT[],
    "compatibleRounds" TEXT[],
    "speedRating" INTEGER NOT NULL,
    "pressureRating" INTEGER NOT NULL,
    "estimatedSolveTimeSec" INTEGER NOT NULL,
    "tags" TEXT[],
    "questionType" TEXT NOT NULL,
    "questionFamilyId" TEXT,
    "realWorldDomain" TEXT,
    "initialCode" TEXT,
    "solutionCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "familyId" TEXT,
    "modePlayed" TEXT NOT NULL,
    "solvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "completionSpeedMs" INTEGER,

    CONSTRAINT "ProblemHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchResult" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "winnerId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER NOT NULL,

    CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchPlayerResult" (
    "id" TEXT NOT NULL,
    "matchResultId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "ratingChange" INTEGER NOT NULL,
    "newRating" INTEGER NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "MatchPlayerResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_rating_idx" ON "User"("rating" DESC);

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "Problem_difficulty_idx" ON "Problem"("difficulty");

-- CreateIndex
CREATE INDEX "Problem_questionFamilyId_idx" ON "Problem"("questionFamilyId");

-- CreateIndex
CREATE INDEX "ProblemHistory_userId_problemId_idx" ON "ProblemHistory"("userId", "problemId");

-- CreateIndex
CREATE INDEX "ProblemHistory_userId_familyId_idx" ON "ProblemHistory"("userId", "familyId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchResult_roomId_key" ON "MatchResult"("roomId");

-- CreateIndex
CREATE INDEX "MatchResult_mode_idx" ON "MatchResult"("mode");

-- CreateIndex
CREATE INDEX "MatchResult_winnerId_idx" ON "MatchResult"("winnerId");

-- CreateIndex
CREATE INDEX "MatchPlayerResult_userId_idx" ON "MatchPlayerResult"("userId");

-- CreateIndex
CREATE INDEX "MatchPlayerResult_matchResultId_idx" ON "MatchPlayerResult"("matchResultId");

-- AddForeignKey
ALTER TABLE "ProblemHistory" ADD CONSTRAINT "ProblemHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemHistory" ADD CONSTRAINT "ProblemHistory_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayerResult" ADD CONSTRAINT "MatchPlayerResult_matchResultId_fkey" FOREIGN KEY ("matchResultId") REFERENCES "MatchResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayerResult" ADD CONSTRAINT "MatchPlayerResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
