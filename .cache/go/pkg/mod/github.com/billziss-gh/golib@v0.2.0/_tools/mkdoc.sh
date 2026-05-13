#!/bin/bash

# requires https://github.com/davecheney/godoc2md

golib="github.com/billziss-gh/golib"

cd $(dirname "$0")/..
(
    sed -n '1,/(GODOC)/p' README.md
    go list -f "{{.ImportPath}} {{.Doc}}" ./... | sed 's@.*/vendor/@@' |
    while read p d; do
        t=${p#$golib/}
        t=${t//[^\/]}
        i=""
        for ((n=0; n < ${#t}; n++)) {
            i="$i  "
        }
        echo "$i* [$(basename $p)](#$p) - $d"
    done
    go list ./... |
    while read p; do
        t=${p#github.com/*/*/vendor/}
        t=${t#$golib/}
        $GOPATH/bin/godoc2md -template _tools/godoc2md.templ $p |
        sed \
            -e "s@github.com/[^/]*/[^/]*/vendor/@@g"\
            -e "s@/src/$golib/@@g"\
            -e "s@/src/target@$t@g"\
            -e "s@?s=[0-9][0-9]*:[0-9][0-9]*#@#@g"
    done
) > README.md.new
mv README.md.new README.md
