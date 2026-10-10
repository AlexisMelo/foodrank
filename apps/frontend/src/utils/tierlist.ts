/** Maximum length of a tierlist name, same as the API (CreateTierlistRequest.NameMaxLength) */
export const TIERLIST_NAME_MAX_LENGTH = 50

/** Maximum length of a tierlist description, same as the API (CreateTierlistRequest.DescriptionMaxLength) */
export const TIERLIST_DESCRIPTION_MAX_LENGTH = 200

/** Emojis the user can pick as a tierlist picture (uploading an image is not supported yet) */
export const TIERLIST_EMOJIS = [
  '🏆',
  '🥇',
  '⭐',
  '🔥',
  '❤️',
  '💎',
  '🎉',
  '😋',
  '🍕',
  '🍔',
  '🌮',
  '🍣',
  '🍜',
  '🥗',
  '🥩',
  '🍝',
  '🥐',
  '🧀',
  '🍰',
  '🍦',
  '🍩',
  '🍳',
  '🥟',
  '🌶️',
  '🍷',
  '🍺',
  '☕',
  '🍽️',
  '👨‍🍳',
  '📍',
  '🌙',
  '💸',
] as const

/** Picture of a new tierlist until the user picks another emoji */
export const DEFAULT_TIERLIST_EMOJI = TIERLIST_EMOJIS[0]
