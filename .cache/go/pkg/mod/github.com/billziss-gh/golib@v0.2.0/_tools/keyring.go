///usr/bin/env go run "$0" "$@"; exit
// +build tool

/*
 * keyring.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

package main

import (
	"fmt"
	"io/ioutil"
	"os"

	"github.com/billziss-gh/golib/keyring"
)

func fail(err error) {
	fmt.Fprintln(os.Stderr, "error:", err)
	os.Exit(1)
}

func usage() {
	fmt.Fprintln(os.Stderr, `usage: keyring {get|set|del} service user`)
	os.Exit(2)
}

func main() {
	if 4 != len(os.Args) {
		usage()
	}

	command := os.Args[1]
	service := os.Args[2]
	user := os.Args[3]

	switch command {
	case "get":
		pass, err := keyring.Get(service, user)
		if nil != err {
			fail(err)
		}
		os.Stdout.WriteString(pass)
	case "set":
		pass, err := ioutil.ReadAll(os.Stdin)
		if nil != err {
			fail(err)
		}
		err = keyring.Set(service, user, string(pass))
		if nil != err {
			fail(err)
		}
	case "del":
		err := keyring.Delete(service, user)
		if nil != err {
			fail(err)
		}
	default:
		usage()
	}
}
