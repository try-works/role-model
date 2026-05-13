/*
 * escape_test.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

package terminal

import (
	"bytes"
	"math/rand"
	"strings"
	"testing"
)

func testCodes(s string) string {
	return strings.ToUpper(s)
}

var testEscapeDelims = []string{
	`{{{{ }}}}`,
	`{{{{ }}}}`,
	`{{{{ }}}}`,
	`{{{{ }}}}`,
	`{{{{ }}}}`,
	`{{{{ }}}}`,
	`{{ }}`,
	`{{ }}`,
	`{{ }}`,
	`{ }`,
	`{ }`,
	`{ }`,
}
var testEscapeInputs = []string{
	`hello world`,
	`hello world {{{{red`,
	`hello }}}}world`,
	`hello {{{{red}}}} world, hello {{{{green}}}} world, {{{{}}}}he{{{l}}}lo {{{{blue`,
	`hello {{{{red}}}} world, hello {{{{green}}}} world, {{{{}}}}he{{{l}}}lo {{{{blue}}}} world`,
	`hello {{{{red}}}} world, hello {{{{green}}}} world, {{{{}}}}he{{{l}}}lo {{{{blue}}} }}}} world`,
	`hello {{red}} world, hello {{green}} world, {{}}he{l}lo {{blue`,
	`hello {{red}} world, hello {{green}} world, {{}}he{l}lo {{blue}} world`,
	`hello {{red}} world, hello {{green}} world, {{}}he{l}lo {{blue} }} world`,
	`hello {red} world, hello {green} world, {}he{l}lo {{blue`,
	`hello {red} world, hello {green} world, {}he{l}lo {{blue}} world`,
	`hello {red} world, hello {green} world, {}he{l}lo {{blue} }} world`,
}
var testEscapeOutputs = []string{
	`hello world`,
	`hello world `,
	`hello }}}}world`,
	`hello RED world, hello GREEN world, he{{{l}}}lo `,
	`hello RED world, hello GREEN world, he{{{l}}}lo BLUE world`,
	`hello RED world, hello GREEN world, he{{{l}}}lo BLUE}}}  world`,
	`hello RED world, hello GREEN world, he{l}lo `,
	`hello RED world, hello GREEN world, he{l}lo BLUE world`,
	`hello RED world, hello GREEN world, he{l}lo BLUE}  world`,
	`hello RED world, hello GREEN world, heLlo `,
	`hello RED world, hello GREEN world, heLlo {BLUE} world`,
	`hello RED world, hello GREEN world, heLlo {BLUE }} world`,
}

func TestEscape(t *testing.T) {
	for i := range testEscapeDelims {
		r := Escape(testEscapeInputs[i], testEscapeDelims[i], testCodes)
		if r != testEscapeOutputs[i] {
			t.Errorf("%d %#v", i, r)
		}
	}
}

func TestEscapeWriter(t *testing.T) {
	for j := 0; 1000 > j; j++ {
		for i := range testEscapeDelims {
			var buf bytes.Buffer
			w := NewEscapeWriter(&buf, testEscapeDelims[i], testCodes)

			for l, h := 0, 0; len(testEscapeInputs[i]) > l; l = h {
				h = l + rand.Intn(len(testEscapeInputs[i]))
				if len(testEscapeInputs[i]) < h {
					h = len(testEscapeInputs[i])
				}

				b := []byte(testEscapeInputs[i][l:h])
				n, err := w.Write(b)
				if n != len(b) || nil != err {
					t.Error(j, i)
				}
			}

			r := buf.String()
			if r != testEscapeOutputs[i] {
				t.Errorf("%d %d %#v", j, i, r)
			}
		}
	}
}
