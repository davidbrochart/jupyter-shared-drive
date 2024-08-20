# Contributing to Jupyter Shared Drive

If you're reading this section, you're probably interested in contributing to
Jupyter Shared Drive. Welcome and thanks for your interest in contributing!

## Setting up a development environment

```console
micromamba create -n jupyter-shared-drive
micromamba activate jupyter-shared-drive
micromamba install pip nodejs
pip install --upgrade pip
git clone https://github.com/davidbrochart/jupyter-shared-drive
cd jupyter-shared-drive
# install monorepo
pip install -e ".[dev]"
# install local dependencies as editable
pip install -e projects/jupyter-shared-drive-ui -e projects/jupyter-shared-docprovider -e projects/jupyter-server-signaling
# link lab extensions
jupyter labextension develop --overwrite projects/jupyter-shared-drive-ui
jupyter labextension develop --overwrite projects/jupyter-shared-docprovider
```
