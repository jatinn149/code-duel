export class EloRating {
  private static K_FACTOR = 32;

  /**
   * Calculate expected score for player A against player B
   */
  static getExpectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  /**
   * Calculate new rating
   * @param rating Current rating
   * @param actualScore 1 for win, 0.5 for draw, 0 for loss
   * @param expectedScore Expected score calculated via getExpectedScore
   */
  static calculateNewRating(rating: number, actualScore: number, expectedScore: number): number {
    return Math.round(rating + this.K_FACTOR * (actualScore - expectedScore));
  }

  /**
   * Helper to get rating change for a match
   */
  static getRatingChange(ratingA: number, ratingB: number, isWin: boolean): number {
    const expected = this.getExpectedScore(ratingA, ratingB);
    const score = isWin ? 1 : 0;
    const newRating = this.calculateNewRating(ratingA, score, expected);
    return newRating - ratingA;
  }
}
