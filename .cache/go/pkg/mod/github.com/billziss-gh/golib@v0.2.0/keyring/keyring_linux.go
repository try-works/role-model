/*
 * keyring_linux.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

package keyring

import (
	"fmt"
	"os/exec"

	"github.com/billziss-gh/golib/errors"
)

// SystemKeyring implements the system-specific keyring.
type SystemKeyring struct {
}

func (self *SystemKeyring) Get(service, user string) (string, error) {
	out, err := exec.Command("secret-tool",
		"lookup", "service", service, "username", user).Output()
	if nil != err {
		return "", errors.New(fmt.Sprintf("cannot get key %s/%s", service, user), err, ErrKeyring)
	}
	return string(out), nil
}

func (self *SystemKeyring) Set(service, user, pass string) error {
	label := fmt.Sprintf("Password for '%s' on '%s'", user, service)
	cmd := exec.Command("secret-tool",
		"store", "service", service, "username", user, "--label", label)
	inp, err := cmd.StdinPipe()
	if nil != err {
		return errors.New(fmt.Sprintf("cannot set key %s/%s", service, user), err, ErrKeyring)
	}
	go func() {
		defer inp.Close()
		inp.Write(([]byte)(pass))
	}()
	err = cmd.Run()
	if nil != err {
		return errors.New(fmt.Sprintf("cannot set key %s/%s", service, user), err, ErrKeyring)
	}
	return nil
}

func (self *SystemKeyring) Delete(service, user string) error {
	err := exec.Command("secret-tool",
		"clear", "service", service, "username", user).Run()
	if nil != err {
		return errors.New(fmt.Sprintf("cannot delete key %s/%s", service, user), err, ErrKeyring)
	}
	return nil
}

func init() {
	DefaultKeyring = &SystemKeyring{}
}
