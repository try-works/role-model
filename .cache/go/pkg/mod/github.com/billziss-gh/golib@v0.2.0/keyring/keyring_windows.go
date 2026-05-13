/*
 * keyring_windows.go
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
	"syscall"
	"unsafe"

	"github.com/billziss-gh/golib/errors"
)

// SystemKeyring implements the system-specific keyring.
type SystemKeyring struct {
}

const (
	_CRED_TYPE_GENERIC          = 1
	_CRED_PERSIST_LOCAL_MACHINE = 2
)

type credential struct {
	flags              uint32
	type_              uint32
	targetName         *uint16
	comment            *uint16
	lastWritten        uint64
	credentialBlobSize uint32
	credentialBlob     *uint8
	persist            uint32
	attributeCount     uint32
	attributes         unsafe.Pointer
	targetAlias        *uint16
	userName           *uint16
}

var (
	dll        = syscall.NewLazyDLL("advapi32.dll")
	credRead   = dll.NewProc("CredReadW")
	credWrite  = dll.NewProc("CredWriteW")
	credDelete = dll.NewProc("CredDeleteW")
	credFree   = dll.NewProc("CredFree")
)

func windowsKeyname(service, user string) string {
	return user + "@" + service
}

func (self *SystemKeyring) get(key string) (user string, pass string, err error) {
	targetName, err := syscall.UTF16PtrFromString(key)
	if nil != err {
		return
	}

	var pcred *credential
	res, _, err := credRead.Call(
		uintptr(unsafe.Pointer(targetName)), _CRED_TYPE_GENERIC, 0, uintptr(unsafe.Pointer(&pcred)))
	if 0 == res {
		return
	}
	defer credFree.Call(uintptr(unsafe.Pointer(pcred)))

	user = syscall.UTF16ToString(
		(*[1 << 29]uint16)(unsafe.Pointer(pcred.userName))[:])
	pass = string(
		(*[1 << 30]uint8)(unsafe.Pointer(pcred.credentialBlob))[:pcred.credentialBlobSize])
	err = nil
	return
}

func (self *SystemKeyring) set(key, user, pass string) (err error) {
	var cred credential
	cred.type_ = _CRED_TYPE_GENERIC
	cred.persist = _CRED_PERSIST_LOCAL_MACHINE
	cred.targetName, err = syscall.UTF16PtrFromString(key)
	if nil != err {
		return
	}
	cred.userName, err = syscall.UTF16PtrFromString(user)
	if nil != err {
		return
	}
	blob := []byte(pass)
	cred.credentialBlobSize = uint32(len(blob))
	cred.credentialBlob = &blob[0]
	res, _, err := credWrite.Call(
		uintptr(unsafe.Pointer(&cred)), 0)
	if 0 == res {
		return
	}

	err = nil
	return
}

func (self *SystemKeyring) delete(key string) (err error) {
	targetName, err := syscall.UTF16PtrFromString(key)
	if nil != err {
		return
	}

	res, _, err := credDelete.Call(
		uintptr(unsafe.Pointer(targetName)), _CRED_TYPE_GENERIC, 0)
	if 0 == res {
		return
	}

	err = nil
	return
}

// this implementation is mostly compatible with Python's keyring

func (self *SystemKeyring) Get(service, user string) (pass string, err error) {
	u, pass, err := self.get(service)
	if nil != err || u != user {
		_, pass, err = self.get(windowsKeyname(service, user))
	}
	if nil != err {
		err = errors.New(fmt.Sprintf("cannot get key %s/%s", service, user), err, ErrKeyring)
	}
	return
}

func (self *SystemKeyring) Set(service, user, pass string) (err error) {
	u, _, err := self.get(service)
	if nil != err || u != user {
		err = self.set(windowsKeyname(service, user), user, pass)
	} else {
		err = self.set(service, user, pass)
	}
	if nil != err {
		err = errors.New(fmt.Sprintf("cannot set key %s/%s", service, user), err, ErrKeyring)
	}
	return
}

func (self *SystemKeyring) Delete(service, user string) (err error) {
	u, _, err := self.get(service)
	if nil != err || u != user {
		err = self.delete(windowsKeyname(service, user))
	} else {
		err = self.delete(service)
		if nil == err {
			self.delete(windowsKeyname(service, user))
		}
	}
	if nil != err {
		err = errors.New(fmt.Sprintf("cannot delete key %s/%s", service, user), err, ErrKeyring)
	}
	return
}

func init() {
	DefaultKeyring = &SystemKeyring{}
}
