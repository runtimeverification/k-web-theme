FROM ubuntu:bionic

ENV TZ=American/Chicago

RUN ln -fs /usr/share/zoneinfo/America/Chicago /etc/localtime
RUN    apt-get update          \
    && apt-get upgrade --yes   \
    && DEBIAN_FRONTEND=noninteractive apt-get install --yes tzdata

RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
RUN    apt-get update               \
    && apt-get upgrade --yes        \
    && apt-get install --yes nodejs

RUN npm install -g yarn psvm spago
RUN psvm install v0.13.8
RUN psvm use v0.13.8

ARG USER_ID=1000
ARG GROUP_ID=1000
RUN    groupadd -g $GROUP_ID user                     \
    && useradd -m -u $USER_ID -s /bin/sh -g user user

USER user:user

ENV LC_ALL=C.UTF-8

ENV LD_LIBRARY_PATH=/usr/local/lib
ENV NPM_PACKAGES=/home/user/.npm-packages
ENV PATH=$NPM_PACKAGES/bin:$PATH
RUN npm config set prefix $NPM_PACKAGES