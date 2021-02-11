import { useDebouncedFn } from 'beautiful-react-hooks'
import classnames from 'classnames'
import { Card } from 'lib/components/Card'
import { ActionsCard } from 'lib/components/proposals/ActionsCard'
import { TextInputGroup } from 'lib/components/TextInputGroup'
import { useUserCanCreateProposal } from 'lib/hooks/useUserCanCreateProposal'
import React from 'react'
import { useState } from 'react'
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form'
import ReactMarkdown from 'react-markdown'
import gfm from 'remark-gfm'

export const ProposalCreationForm = () => {
  const { userCanCreateProposal } = useUserCanCreateProposal()
  const formMethods = useForm()

  const [actions, setActions] = useState([
    {
      id: Date.now()
    }
  ])

  return (
    <>
      <FormProvider {...formMethods}>
        <button onClick={() => console.log(formMethods.getValues())}>TEST: Log Form Values</button>
        <button onClick={() => console.log(formMethods.formState)}>TEST: Log State</button>
        <button onClick={() => formMethods.trigger()}>Trigger Validation</button>
        <ActionsCard actions={actions} setActions={setActions} />
        <TitleCard disabled={!userCanCreateProposal} />
        <DescriptionCard disabled={!userCanCreateProposal} />
      </FormProvider>
    </>
  )
}

const TitleCard = (props) => {
  const { disabled } = props
  const { register } = useFormContext()

  return (
    <Card>
      <h4 className='mb-6'>Title</h4>
      <p className='mb-4'>
        The title is the first introduction of your proposal to the voters. Make sure to make it
        clear and to the point.
      </p>
      <TextInputGroup
        disabled={disabled}
        placeholder='Enter the title of your proposal'
        id='_proposalTitle'
        label='Proposal title'
        name='title'
        required
        register={register}
      />
    </Card>
  )
}

const DescriptionCard = (props) => {
  const { disabled } = props
  const { register, control } = useFormContext()
  const name = 'description'
  const text = useWatch({ control, name, defaultValue: '' })

  return (
    <Card>
      <h4 className='mb-6'>Description</h4>
      <p className='mb-4'>
        The description should present in full detail what the actions of the proposal are doing.
        This is where voters will educate themselves on what they are voting on.
      </p>
      <MarkdownInputArea name={name} text={text} register={register} disabled={disabled} />
    </Card>
  )
}

const MarkdownInputArea = (props) => {
  const { text, name, register, disabled } = props

  const tabs = [
    {
      title: 'Write',
      view: (
        <TextArea
          placeholder='Add the proposal details here'
          rows={15}
          disabled={disabled}
          name='description'
          required
          register={register}
        />
      )
    },
    {
      title: 'Preview',
      view: <MarkdownPreview text={text} />
    }
  ]

  return <TabbedView tabs={tabs} />
}

const TextArea = (props) => {
  const { register, required, pattern, validate, classNames, ...textAreaProps } = props
  return (
    <textarea
      className={classnames('p-1 bg-body text-inverse w-full resize-none', classNames)}
      ref={register({ required, pattern, validate })}
      {...textAreaProps}
    />
  )
}

const MarkdownPreview = (props) => {
  const { text } = props

  return (
    <ReactMarkdown
      plugins={[gfm]}
      className='description whitespace-pre-wrap break-word h-96 overflow-y-auto'
      children={text}
    />
  )
}

const TabbedView = (props) => {
  const { tabs, initialTabIndex } = props
  const [selectedTabIndex, setSelectedTabIndex] = useState(initialTabIndex)
  return (
    <>
      <div className='flex'>
        {tabs.map((tab, index) => (
          <Tab
            key={`${tab.title}-${index}-tab`}
            tab={tab.title}
            isSelected={selectedTabIndex === index}
            setTab={() => setSelectedTabIndex(index)}
          />
        ))}
      </div>
      <div className='bg-body p-8 border border-accent-3 rounded-b-lg'>
        {tabs.map((tab, index) => (
          <div
            key={`${tab.title}-${index}-view`}
            className={classnames({ hidden: selectedTabIndex !== index })}
          >
            {tab.view}
          </div>
        ))}
      </div>
    </>
  )
}

TabbedView.defaultProps = {
  initialTabIndex: 0
}

const Tab = (props) => {
  const { tab, setTab, isSelected } = props
  return (
    <div
      className={classnames('p-4 sm:px-8 sm:py-4 font-bold cursor-pointer', {
        'bg-body border-accent-3 border-t border-l border-r rounded-t-lg': isSelected
      })}
      onClick={(e) => {
        e.preventDefault()
        setTab()
      }}
    >
      {tab}
    </div>
  )
}