import { Match as M, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import type { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Icon from '@/demo/icon-preview'
import { button } from '@/ui/button'
import { card, cardContent, cardFooter, cardHeader, cardTitle } from '@/ui/card'
import { field, fieldGroup, fieldLabel } from '@/ui/field'
import { inputGroup, inputGroupAddon, inputGroupInput } from '@/ui/input-group'

export const Model = S.Struct({
  spotifyUrl: S.String,
  instagramHandle: S.String,
  soundcloudUrl: S.String,
  websiteUrl: S.String,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedSpotifyUrl: {
    value: S.String,
  },
  UpdatedInstagramHandle: {
    value: S.String,
  },
  UpdatedSoundcloudUrl: {
    value: S.String,
  },
  UpdatedWebsiteUrl: {
    value: S.String,
  },
})
export type Message = typeof Message.Type

type UpdateReturn = Update.Return<Model, Message>

export const init = (): Model => ({
  spotifyUrl: 'spotify.com/artist/3j...2k',
  instagramHandle: '@julianduryea_music',
  soundcloudUrl: '',
  websiteUrl: '',
})

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      UpdatedSpotifyUrl: ({ value }) => ({
        model: { ...model, spotifyUrl: value },
      }),
      UpdatedInstagramHandle: ({ value }) => ({
        model: { ...model, instagramHandle: value },
      }),
      UpdatedSoundcloudUrl: ({ value }) => ({
        model: { ...model, soundcloudUrl: value },
      }),
      UpdatedWebsiteUrl: ({ value }) => ({
        model: { ...model, websiteUrl: value },
      }),
    }),
  )

type SocialFieldProps = Readonly<{
  id: string
  label: string
  icon: string
  value: string
  onInput: (value: string) => Message
  placeholder?: string
}>

const socialField = (props: SocialFieldProps, h: HtmlBuilder<Message>): Html =>
  field(
    {
      children: [
        fieldLabel({ for: props.id, children: [props.label] }, h),
        inputGroup(
          {
            children: [
              inputGroupAddon(
                {
                  children: [Icon.icon<Message>(props.icon, {}, h)],
                },
                h,
              ),
              inputGroupInput(
                {
                  id: props.id,
                  value: props.value,
                  onInput: props.onInput,
                  ...(props.placeholder === undefined
                    ? {}
                    : { placeholder: props.placeholder }),
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  card(
    {
      children: [
        cardHeader(
          {
            children: [cardTitle({ children: ['Social Links'] }, h)],
          },
          h,
        ),
        cardContent(
          {
            children: [
              fieldGroup(
                {
                  class: 'gap-5',
                  children: [
                    socialField(
                      {
                        id: 'spotify-url',
                        label: 'Spotify Artist URL',
                        icon: 'circle-plus',
                        value: model.spotifyUrl,
                        onInput: value => Message.UpdatedSpotifyUrl({ value }),
                      },
                      h,
                    ),
                    socialField(
                      {
                        id: 'instagram-handle',
                        label: 'Instagram Handle',
                        icon: 'camera',
                        value: model.instagramHandle,
                        onInput: value =>
                          Message.UpdatedInstagramHandle({ value }),
                      },
                      h,
                    ),
                    socialField(
                      {
                        id: 'soundcloud-url',
                        label: 'SoundCloud URL',
                        icon: 'cloud',
                        value: model.soundcloudUrl,
                        onInput: value =>
                          Message.UpdatedSoundcloudUrl({ value }),
                        placeholder: 'soundcloud.com/username',
                      },
                      h,
                    ),
                    socialField(
                      {
                        id: 'website-url',
                        label: 'Website',
                        icon: 'globe',
                        value: model.websiteUrl,
                        onInput: value => Message.UpdatedWebsiteUrl({ value }),
                        placeholder: 'https://yoursite.com',
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
            ],
          },
          h,
        ),
        cardFooter(
          {
            class: 'justify-end gap-2',
            children: [
              button({ variant: 'secondary', children: ['Discard'] }, h),
              button({ children: ['Save Changes'] }, h),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )

/*
Minimal wiring:
const model = init()
const nextModelOp__ = update(model, message);
    const nextModel = nextModelOp__.model;
    const commands = nextModelOp__.commands ?? [];
const cardView = view(model)
*/
// Stateful? yes. Submodels wired: none (local controlled inputs). PORT NOTEs: style-sera classes stripped.
