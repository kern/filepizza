#!/bin/sh

#Move to the folder where FilePizza is installed
cd `dirname $0`

#Was this script started in the bin folder? if yes move out
if [ -d "../bin" ]; then
  cd "../"
fi

ignoreRoot=0
for ARG in $*
do
  if [ "$ARG" = "--root" ]; then
    ignoreRoot=1
  fi
done

#Stop the script if its started as root
if [ "$(id -u)" -eq 0 ] && [ $ignoreRoot -eq 0 ]; then
   echo "You shouldn't start FilePizza as root!"
   echo "Please type 'FilePizza rocks my socks' or supply the '--root' argument if you still want to start it as root"
   read rocks
   if [ "$rocks" != "FilePizza rocks my socks" ]
   then
     echo "Your input was incorrect"
     exit 1
   fi
fi

# FilePizza config

#export PORT=8080
#export TWILIO_SID=abcdef
#export TWILIO_TOKEN=ghijkl

# When settings sensitive information here (API token) remeber to secure the file to prevent other users from reading it!

# enable production mode
export NODE_ENV=production

#finally start FilePizza
echo "Started FilePizza..."

./index.js $@

