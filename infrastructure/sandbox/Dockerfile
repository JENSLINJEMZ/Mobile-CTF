# CTF sandbox base image.
#
# The terminal runs interactively inside this container. The image carries an
# offline-friendly CTF toolset (python3 + pycryptodome, openssl, binary and
# data utilities, editors) on Alpine with a non-root "ctf" user. Network
# tooling is deliberately NOT baked in — the runtime launches the container
# with --network none, and the root filesystem is mounted read-only.
#
# Stage 6 scoping: only container-level isolation is implemented. Kernel-level
# defenses (gVisor / Firecracker) are a documented follow-up in SECURITY.md.

FROM alpine:3.20

ARG CTF_USER_ID=10001
ARG CTF_GROUP_ID=10001

RUN apk add --no-cache \
      bash \
      bc \
      binutils \
      bzip2 \
      coreutils \
      file \
      gzip \
      jq \
      nano \
      openssl \
      procps \
      py3-pycryptodome \
      python3 \
      sqlite \
      unzip \
      util-linux \
      xxd \
      xz \
      zip \
    && addgroup -g "${CTF_GROUP_ID}" ctf \
    && adduser -D -u "${CTF_USER_ID}" -G ctf -s /bin/bash ctf

RUN printf '%s\n' \
    '=============================================' \
    '  CTF terminal sandbox — isolated container ' \
    '  network disabled, non-root user, limited   ' \
    '  memory/CPU/PID, read-only root filesystem. ' \
    '  python3, openssl, binutils/strings, xxd,   ' \
    '  jq, sqlite3, editors + common utilities.   ' \
    '  Type exit to close this session.' \
    '=============================================' \
    > /etc/motd

WORKDIR /home/ctf
USER ctf

ENV HOME=/home/ctf \
    SHELL=/bin/bash \
    PS1='\u@ctf:\w\$ '

CMD ["/bin/bash"]