"""
Calendario LVBP 26/27 - Domain Models & Invariants
Military-grade domain modeling with deterministic verification.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Set
from enum import Enum


class GameStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    FINAL = "final"
    POSTPONED = "postponed"
    SUSPENDED = "suspended"


class StampRarity(str, Enum):
    COMMON = "common"
    RARE = "rare"
    HOLOGRAPHIC = "holographic"
    LEGENDARY = "legendary"


@dataclass(frozen=True)
class Team:
    slug: str
    name: str
    city: str
    stadium: str
    primary_color: str
    secondary_color: str
    classic_rival: str


# The 8 official LVBP franchises
TEAMS: Dict[str, Team] = {
    "aguilas": Team("aguilas", "Águilas del Zulia", "Maracaibo", "Luis Aparicio El Grande", "#ff6600", "#000000", "cardenales"),
    "bravos": Team("bravos", "Bravos de Margarita", "Porlamar", "Nueva Esparta", "#008080", "#ffffff", "caribes"),
    "cardenales": Team("cardenales", "Cardenales de Lara", "Barquisimeto", "Antonio Herrera Gutiérrez", "#d6001c", "#000000", "aguilas"),
    "caribes": Team("caribes", "Caribes de Anzoátegui", "Puerto La Cruz", "Alfonso 'Chico' Carrasquel", "#ff6600", "#003366", "bravos"),
    "leones": Team("leones", "Leones del Caracas", "Caracas", "Estadio Monumental Simón Bolívar", "#14110b", "#c9a227", "magallanes"),
    "magallanes": Team("magallanes", "Navegantes del Magallanes", "Valencia", "José Bernardo Pérez", "#0a3a8c", "#f2b705", "leones"),
    "tiburones": Team("tiburones", "Tiburones de La Guaira", "La Guaira / Caracas", "Jorge Luis García Carneiro / UCV", "#c8102e", "#00205b", "leones"),
    "tigres": Team("tigres", "Tigres de Aragua", "Maracay", "José Pérez Colmenares", "#001e62", "#d81e05", "magallanes"),
}


@dataclass
class Game:
    id: str
    date: str  # YYYY-MM-DD
    time: str  # HH:MM or "TBD"
    visitor: str
    home: str
    stadium: str
    status: GameStatus = GameStatus.SCHEDULED
    home_score: Optional[int] = None
    visitor_score: Optional[int] = None
    home_hits: Optional[int] = None
    visitor_hits: Optional[int] = None
    home_errors: Optional[int] = None
    visitor_errors: Optional[int] = None
    winning_pitcher: Optional[str] = None
    losing_pitcher: Optional[str] = None
    save_pitcher: Optional[str] = None

    def validate(self) -> bool:
        if self.visitor not in TEAMS or self.home not in TEAMS:
            raise ValueError(f"Invalid team in game {self.id}: {self.visitor} vs {self.home}")
        if self.visitor == self.home:
            raise ValueError(f"Self-play not allowed: {self.visitor}")
        if self.status == GameStatus.FINAL:
            if self.home_score is None or self.visitor_score is None:
                raise ValueError(f"Final game {self.id} must have scores")
            if self.home_score == self.visitor_score:
                raise ValueError(f"Baseball games cannot end in a tie: {self.home_score}-{self.visitor_score}")
        return True

    @property
    def winner(self) -> Optional[str]:
        if self.status != GameStatus.FINAL or self.home_score is None or self.visitor_score is None:
            return None
        return self.home if self.home_score > self.visitor_score else self.visitor


@dataclass
class Prediction:
    user_id: str
    game_id: str
    predicted_home_score: int
    predicted_visitor_score: int
    created_at: str
    signature: str = ""

    def calculate_points(self, game: Game) -> int:
        if game.status != GameStatus.FINAL or game.home_score is None or game.visitor_score is None:
            return 0
        points = 0
        actual_winner = game.winner
        predicted_winner = game.home if self.predicted_home_score > self.predicted_visitor_score else game.visitor
        
        # 1. Exact Winner match: 5 pts
        if actual_winner == predicted_winner:
            points += 5
            # 2. Exact score differential: +3 pts
            actual_diff = abs(game.home_score - game.visitor_score)
            pred_diff = abs(self.predicted_home_score - self.predicted_visitor_score)
            if actual_diff == pred_diff:
                points += 3
            # 3. Exact bullseye score: +7 pts (Total 15 pts)
            if self.predicted_home_score == game.home_score and self.predicted_visitor_score == game.visitor_score:
                points += 7
        return points


@dataclass
class CollectibleStamp:
    id: str
    name: str
    team_slug: str
    rarity: StampRarity
    description: str
    unlock_condition: str
    asset_url: str
    unlocked_at: Optional[str] = None


@dataclass
class UserAlbum:
    user_id: str
    favorite_team: str
    marked_scores: Dict[str, Dict[str, int]] = field(default_factory=dict)
    unlocked_stamps: Set[str] = field(default_factory=set)
    total_points: int = 0
    notifications_enabled: bool = True
    notification_channel: str = "hubmy_push"