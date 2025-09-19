# IMPORTANT: Tracing must be initialized FIRST before any other imports
from tracing import setup_tracing
setup_tracing()

from ai_scheduler.app import main

if __name__ == '__main__':
    main()


