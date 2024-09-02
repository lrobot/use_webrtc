#!/usr/bin/env bash
set -euox pipefail

# This script builds WebRTC for Open3D for Ubuntu and macOS. For Windows, see
# .github/workflows/webrtc.yml
#
# Usage:
# $ bash # Start a new shell
# Specify custom configuration by exporting environment variables
# GLIBCXX_USE_CXX11_ABI, WEBRTC_COMMIT and DEPOT_TOOLS_COMMIT, if required.
# $ source 3rdparty/webrtc/webrtc_build.sh
# $ install_dependencies_ubuntu   # Ubuntu only
# $ download_webrtc_sources
# $ build_webrtc
# A webrtc_<commit>_platform.tar.gz file will be created that can be used to
# build Open3D with WebRTC support.
#
# Procedure:
#
# 1) Download depot_tools, webrtc to following directories:
#    ├── Oepn3D
#    ├── depot_tools
#    └── webrtc
#        ├── .gclient
#        └── src
#
# 2) depot_tools and webrtc have compatible versions, see:
#    https://chromium.googlesource.com/chromium/src/+/master/docs/building_old_revisions.md
#
# 3) Apply the following patch to enable GLIBCXX_USE_CXX11_ABI selection:
#    - 0001-build-enable-rtc_use_cxx11_abi-option.patch        # apply to webrtc/src
#    - 0001-src-enable-rtc_use_cxx11_abi-option.patch          # apply to webrtc/src/build
#    - 0001-third_party-enable-rtc_use_cxx11_abi-option.patch  # apply to webrtc/src/third_party
#    Note that these patches may or may not be compatible with your custom
#    WebRTC commits. You may have to patch them manually.

# Date: Wed Apr 7 19:12:13 2021 +0200
WEBRTC_COMMIT=${WEBRTC_COMMIT:-60e674842ebae283cc6b2627f4b6f2f8186f3317}
# Date: Wed Apr 7 21:35:29 2021 +0000
DEPOT_TOOLS_COMMIT=${DEPOT_TOOLS_COMMIT:-e1a98941d3ab10549be6d82d0686bb0fb91ec903}

GLIBCXX_USE_CXX11_ABI=${GLIBCXX_USE_CXX11_ABI:-0}
NPROC=${NPROC:-$(getconf _NPROCESSORS_ONLN)} # POSIX: MacOS + Linux
SUDO=${SUDO:-sudo}                           # Set to command if running inside docker
export PATH="$PWD/depot_tools":${PATH}    # $(basename $PWD) == Open3D
export DEPOT_TOOLS_UPDATE=0

install_dependencies_ubuntu() {
    options="$(echo "$@" | tr ' ' '|')"
    # Dependencies
    # python*       : resolve ImportError: No module named pkg_resources
    # libglib2.0-dev: resolve pkg_config("glib")
    $SUDO apt-get update
    $SUDO apt-get install -y \
        apt-transport-https \
        build-essential \
        ca-certificates \
        git \
        gnupg \
        libglib2.0-dev \
        python3 \
        python3-pip \
        python3-setuptools \
        python3-wheel \
        software-properties-common \
        tree \
        curl
    curl https://apt.kitware.com/keys/kitware-archive-latest.asc \
        2>/dev/null | gpg --dearmor - |
        $SUDO sed -n 'w /etc/apt/trusted.gpg.d/kitware.gpg' # Write to file, no stdout
    source <(grep VERSION_CODENAME /etc/os-release)
    $SUDO apt-add-repository --yes "deb https://apt.kitware.com/ubuntu/ $VERSION_CODENAME main"
    $SUDO apt-get update
    $SUDO apt-get --yes install cmake
    cmake --version >/dev/null
    if [[ "purge-cache" =~ ^($options)$ ]]; then
        $SUDO apt-get clean
        $SUDO rm -rf /var/lib/apt/lists/*
    fi
}

download_webrtc_sources() {
    # PWD=Open3D
    pushd .
    echo Get depot_tools
    git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
    git -C depot_tools checkout $DEPOT_TOOLS_COMMIT
    command -V fetch

    echo Get WebRTC
    mkdir webrtc
    cd webrtc
    #fetch webrtc
    #fetch -n webrtc

    if [ "`uname`" == "Darwin" ]; then
            gclient config --spec 'solutions = [
  {
    "name": "src",
    "url": "https://github.com/lrobot/webrtc.git",
    "deps_file": "DEPS",
    "managed": False,
    "custom_deps": {},
  },
]
target_os = ["ios", "mac"];
'
    else
     gclient config --spec 'solutions = [
  {
    "name": "src",
    "url": "https://github.com/lrobot/webrtc.git",
    "deps_file": "DEPS",
    "managed": False,
    "custom_deps": {},
  },
]
target_os = ["android"];
'
    fi

    gclient sync --with_branch_heads

    # Checkout to a specific version
    # Ref: https://chromium.googlesource.com/chromium/src/+/master/docs/building_old_revisions.md
    git -C src checkout $WEBRTC_COMMIT
    git -C src submodule update --init --recursive
    echo gclient sync
    gclient sync -D --force --reset
    cd ..
    echo random.org
    curl "https://www.random.org/cgi-bin/randbyte?nbytes=10&format=h" -o skipcache
    popd
}

build_webrtc_one() {
  pushd webrtc/src
    arg_target_os=$1
    arg_target_cpu=$2
    arg_target_debugrelease=$3
  args_val=' treat_warnings_as_errors=true fatal_linker_warnings=true rtc_include_tests=false ffmpeg_branding = "Chrome" rtc_use_h264=true'
  if [ "x$arg_target_debugrelease" == "xdebug" ]; then
    args_val+=' is_debug = true'
  else
    args_val+=' is_debug = false'
  fi

  if [ x"$arg_target_os" == x"android" ] ; then
	args_val+=' target_os="android"'
  fi
  if [ x"$arg_target_os" == x"ios" ] ; then
	args_val+=' target_os="ios"'
  fi
  if [ x"$arg_target_os" == x"mac" ] ; then
	args_val+=' target_os="mac"'
  fi


  if [ x"$arg_target_cpu" == x"armeabi" ] ; then
	args_val+=' target_cpu="arm"'
  fi
  if [ x"$arg_target_cpu" == x"armeabi-v7a" ] ; then
	args_val+=' target_cpu="arm" arm_version=7'
  fi
  if [ x"$arg_target_cpu" == x"arm64" ] ; then
	args_val+=' target_cpu="arm64"'
  fi
  if [ x"$arg_target_cpu" == x"arm64-v8a" ] ; then
	args_val+=' target_cpu="arm64" arm_version=8'
  fi
  if [ x"$arg_target_cpu" == x"x86" ] ; then
	args_val+=' target_cpu="x86"'
  fi
  if [ x"$arg_target_cpu" == x"x64" ] ; then
	args_val+=' target_cpu="x64"'
  fi

  gn gen --args="$args_val" out/${arg_target_os}/${arg_target_debugrelease}/${arg_target_cpu} 
  popd
}
build_webrtc() {
    # PWD=Open3D
    WEBRTC_COMMIT_SHORT=$(git -C webrtc/src rev-parse --short=7 HEAD)

    [ "`uname`" == "Darwin" ] && {
        build_webrtc_one ios arm64-v8a debug
        build_webrtc_one ios arm64-v8a release
        build_webrtc_one mac x64 debug
        build_webrtc_one mac x64 release
    }

    [ "`uname`" == "Linux" ] && {
        build_webrtc_one android arm64 debug
        build_webrtc_one android arm64 release
        ls -alh webrtc/src/out/android/debug/arm64
        ls -alh webrtc/src/out/android/release/arm64
    }

}


if [ "x$1" == "x" ]; then
    echo "Usage: $0 install_dependencies_ubuntu|download_webrtc_sources|build_webrtc"
    exit 1
else
    $1
fi


