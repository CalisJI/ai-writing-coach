"""PostgreSQL shadow persistence foundation.

The running application remains on the existing SQLite repositories until a
later, explicit cutover milestone.  This package is safe to import without a
PostgreSQL server being available.
"""

from writing_coach.persistence.models import Base

__all__ = ["Base"]
