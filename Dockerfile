FROM ubuntu:bionic

RUN    apt update         \
    && apt upgrade --yes  \
    && apt install --yes  \
        curl              \
        git

RUN curl -sL https://deb.nodesource.com/setup_14.x | bash -
RUN    apt-get update               \
    && apt-get upgrade --yes        \
    && apt-get install --yes nodejs

ARG USER_ID=1000
ARG GROUP_ID=1000
RUN    groupadd --gid $GROUP_ID user                                        \
    && useradd --create-home --uid $USER_ID --shell /bin/sh --gid user user

USER $USER_ID:$GROUP_ID