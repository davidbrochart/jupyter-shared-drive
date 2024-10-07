# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import importlib.metadata


try:
    __version__ = importlib.metadata.version("jupyter-shared-drive")
except importlib.metadata.PackageNotFoundError:
    __version__ = "unknown"
