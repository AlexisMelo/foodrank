import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RatingScores from '@/components/RatingScores.vue'

const GREEN = 'rgb(144, 190, 109)'
const YELLOW = 'rgb(249, 199, 79)'
const RED = 'rgb(255, 107, 107)'

describe('RatingScores', () => {
  it('shows the food, service and decor scores rounded', () => {
    const wrapper = mount(RatingScores, { props: { food: 84.6, service: 70.2, decor: 12.5 } })

    const values = wrapper.findAll('.score-value').map((v) => v.text())

    expect(values).toEqual(['85', '70', '13'])
  })

  it('colors scores green from 85, yellow from 65, red below', () => {
    const wrapper = mount(RatingScores, { props: { food: 85, service: 65, decor: 64.9 } })

    const colors = wrapper.findAll('.score-value').map((v) => (v.element as HTMLElement).style.color)

    expect(colors).toEqual([GREEN, YELLOW, RED])
  })
})
