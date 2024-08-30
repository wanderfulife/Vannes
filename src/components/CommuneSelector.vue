<template>
  <div class="form-group">
    <input class="form-control" type="text" v-model="localPostalCodePrefix"
      placeholder="Code Postal" />
    <input class="form-control" type="text" :value="modelValue" @input="updateCommune($event.target.value)"
      placeholder="COMMUNE" />

    <ul v-if="showDropdown && modelValue && filteredCommunes.length" class="commune-dropdown">
      <li v-for="(item, index) in filteredCommunes" :key="`${item['CODE INSEE']}-${index}`" @click="selectCommune(item)">
        {{ item.COMMUNE }} - {{ item.DEPARTEMENT }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import insee from "./output.json";

const props = defineProps({
  modelValue: String,
  postalCodePrefix: String
});

const emit = defineEmits(['update:modelValue']);

const localPostalCodePrefix = ref(props.postalCodePrefix);
const showDropdown = ref(false);

// Watch for changes in the postalCodePrefix prop
watch(() => props.postalCodePrefix, (newVal) => {
  localPostalCodePrefix.value = newVal;
});

const updateCommune = (newValue) => {
  emit('update:modelValue', newValue);
  showDropdown.value = true;
};

const selectCommune = (item) => {
  emit('update:modelValue', `${item.COMMUNE} - ${item['CODE INSEE']}`);
  showDropdown.value = false;
};

const filteredCommunes = computed(() => {
  return insee.filter(item => {
    const postalCode = item['CODE POSTAL'] ? item['CODE POSTAL'].toString() : '';
    const commune = item.COMMUNE ? item.COMMUNE.toLowerCase() : '';
    const matchesPostalCode = postalCode.startsWith(localPostalCodePrefix.value);
    const matchesCommune = commune.includes(props.modelValue.toLowerCase());
    return matchesPostalCode && matchesCommune;
  });
});
</script>
