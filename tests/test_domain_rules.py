"""
Unit Tests for LVBP Domain Rules & Constraints
Mission-critical deterministic validation.
"""

import unittest
import json
from src.domain.models import TEAMS, Game, GameStatus, Prediction, CollectibleStamp, StampRarity


class TestLVBPDomainRules(unittest.TestCase):
    def setUp(self):
        with open("src/domain/schedule_raw.json", "r", encoding="utf-8") as f:
            self.raw_games = json.load(f)

    def test_eight_official_teams_integrity(self):
        """Validate that all 8 franchises exist and have complete invariants."""
        self.assertEqual(len(TEAMS), 8)
        expected_slugs = {"aguilas", "bravos", "cardenales", "caribes", "leones", "magallanes", "tiburones", "tigres"}
        self.assertEqual(set(TEAMS.keys()), expected_slugs)

        for slug, team in TEAMS.items():
            self.assertEqual(slug, team.slug)
            self.assertTrue(len(team.name) > 3)
            self.assertTrue(team.primary_color.startswith("#"))
            self.assertTrue(team.classic_rival in TEAMS)
            self.assertNotEqual(team.slug, team.classic_rival)

    def test_official_224_games_schedule(self):
        """Validate all 224 official games of regular season."""
        self.assertEqual(len(self.raw_games), 224)
        for idx, g in enumerate(self.raw_games):
            self.assertIn("f", g, f"Game {idx} missing date")
            self.assertIn("v", g, f"Game {idx} missing visitor")
            self.assertIn("l", g, f"Game {idx} missing home")
            self.assertIn(g["v"], TEAMS, f"Unknown visitor team: {g['v']}")
            self.assertIn(g["l"], TEAMS, f"Unknown home team: {g['l']}")
            self.assertNotEqual(g["v"], g["l"], f"Self play detected in game {idx}")

    def test_baseball_score_invariant(self):
        """Validate baseball score invariants (no ties allowed in final games)."""
        valid_game = Game(
            id="test_1",
            date="2026-10-23",
            time="19:00",
            visitor="magallanes",
            home="leones",
            stadium="Monumental",
            status=GameStatus.FINAL,
            home_score=5,
            visitor_score=3
        )
        self.assertTrue(valid_game.validate())
        self.assertEqual(valid_game.winner, "leones")

        # Tie game must raise ValueError
        tied_game = Game(
            id="test_tie",
            date="2026-10-23",
            time="19:00",
            visitor="magallanes",
            home="leones",
            stadium="Monumental",
            status=GameStatus.FINAL,
            home_score=4,
            visitor_score=4
        )
        with self.assertRaises(ValueError):
            tied_game.validate()

    def test_quiniela_scoring_rules(self):
        """Test exact winner (5 pts), margin (+3 pts) and perfect bullseye (+7 pts, total 15)."""
        game = Game(
            id="test_q",
            date="2026-10-23",
            time="19:00",
            visitor="magallanes",
            home="leones",
            stadium="Monumental",
            status=GameStatus.FINAL,
            home_score=6,
            visitor_score=4
        )

        # Case 1: Perfect score (6-4) -> 15 pts
        pred_perfect = Prediction("usr1", "test_q", 6, 4, "2026-10-23T18:00:00")
        self.assertEqual(pred_perfect.calculate_points(game), 15)

        # Case 2: Correct winner and differential (5-3, diff 2) -> 5 + 3 = 8 pts
        pred_diff = Prediction("usr1", "test_q", 5, 3, "2026-10-23T18:00:00")
        self.assertEqual(pred_diff.calculate_points(game), 8)

        # Case 3: Correct winner only (8-3, diff 5) -> 5 pts
        pred_winner = Prediction("usr1", "test_q", 8, 3, "2026-10-23T18:00:00")
        self.assertEqual(pred_winner.calculate_points(game), 5)

        # Case 4: Wrong winner (2-5) -> 0 pts
        pred_wrong = Prediction("usr1", "test_q", 2, 5, "2026-10-23T18:00:00")
        self.assertEqual(pred_wrong.calculate_points(game), 0)


if __name__ == "__main__":
    unittest.main()