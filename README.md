# Jupyter Shared Drive

[![lite-badge](https://jupyterlite.rtfd.io/en/latest/_static/badge.svg)](https://davidbrochart.github.io/jupyter-shared-drive)
[![Build Status](https://github.com/davidbrochart/jupyter-shared-drive/actions/workflows/test.yml/badge.svg?query=branch%3Amain++)](https://github.com/davidbrochart/jupyter-shared-drive/actions?query=branch%3Amain++)
[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/davidbrochart/jupyter-shared-drive/main)
[![PyPI](https://img.shields.io/pypi/v/jupyter-shared-drive)](https://pypi.org/project/jupyter-shared-drive)
[![npm](https://img.shields.io/npm/v/@jupyter/shared-drive-extension)](https://www.npmjs.com/package/@jupyter/shared-drive-extension)

Jupyter Shared Drive consists of an optional Jupyter Server extension and a JupyterLab extension providing support for [Y documents](https://github.com/jupyter-server/jupyter_ydoc) and adding a new drive for sharing these documents through WebRTC.

The server extension provides the signaling service needed for peers to discover each other. It will typically be installed and used with a full JupyterLab setup, but it is not mandatory. For instance, a public signaling server can be used instead, and the JupyterLab frontend extension can be configured to use it. This means that Jupyter Shared Drive can be used without a Jupyter server, and that it works in JupyterLite 🚀

## Installation and Basic usage

To install the latest release locally, make sure you have
[pip installed](https://pip.readthedocs.io/en/stable/installing/) and run:

```bash
pip install jupyter-shared-drive
```

Or using ``conda``/``mamba``/``micromamba`` (soon!):

```bash
conda install -c conda-forge jupyter-shared-drive
```

### Testing

See [CONTRIBUTING](./docs/source/developer/contributing.rst#running-tests).

## Contributing

If you are interested in contributing to the project, see [CONTRIBUTING](./docs/source/developer/contributing.rst).
