# CTF sandbox base image.
#
# The terminal runs interactively inside this container. The image is kept
# deliberately minimal: Alpine with bash and common read-only utilities, a
# non-root "ctf" user, and no network tooling baked in (the container is also
# launched with --network none by the runtime).
#
# Stage 6 scoping: only container-level isolation is implemented. Kernel-level
# defenses (gVisor / Firecracker) are a documented follow-up in SECURITY.md.

FROM alpine:3.20

ARG CTF_USER_ID=10001
ARG CTF_GROUP_ID=10001

RUN apk add --no-cache \
      bash \
      coreutils \
      procps \
      util-linux \
    && addgroup -g "${CTF_GROUP_ID}" ctf \
    && adduser -D -u "${CTF_USER_ID}" -G ctf -s /bin/bash ctf

RUN printf '%s\n' \
    '=============================================' \
    '  CTF terminal sandbox — isolated container ' \
    '  network disabled, non-root user, limited   ' \
    '  memory/CPU/PID, read-only root filesystem. ' \
    '  Type exit to close this session.' \
    '=============================================' \
    > /etc/motd

WORKDIR /home/ctf
USER ctf

ENV HOME=/home/ctf \
    SHELL=/bin/bash \
    PS1='\u@ctf:\w\$ '

CMD ["/bin/bash"]