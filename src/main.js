import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

// Mount Svelte app
const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
